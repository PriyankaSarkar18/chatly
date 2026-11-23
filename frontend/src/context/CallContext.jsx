import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { emitAsync, getSocket } from '../lib/socket';
import { useAuth } from './AuthContext';

const CallContext = createContext(null);

const ICE_FALLBACK = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
};

const mediaConstraints = (type) => ({
  audio: { echoCancellation: true, noiseSuppression: true },
  video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
});

export const CallProvider = ({ children }) => {
  const { user, token } = useAuth();

  const [call, setCall] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | outgoing | incoming | connecting | active | ended
  const [mediaType, setMediaType] = useState('audio');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');

  const pcRef = useRef(null);
  const localRef = useRef(null);
  const callRef = useRef(null);
  const pendingCandidates = useRef([]);
  const timerRef = useRef(null);
  const iceConfig = useRef(ICE_FALLBACK);

  const setActiveCall = (next) => {
    callRef.current = next;
    setCall(next);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopMedia = useCallback(() => {
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const teardown = useCallback(() => {
    clearTimer();
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidates.current = [];
    stopMedia();
    setMuted(false);
    setCameraOff(false);
    setDuration(0);
  }, [stopMedia]);

  const reset = useCallback(
    (message = '') => {
      teardown();
      setPhase('idle');
      setActiveCall(null);
      setError(message);
      if (message) setTimeout(() => setError(''), 5000);
    },
    [teardown]
  );

  const fetchIce = useCallback(async () => {
    try {
      const { data } = await api.get('/call/ice-servers');
      if (data.data?.iceServers?.length) iceConfig.current = data.data;
    } catch {
      /* fall back to public STUN servers */
    }
  }, []);

  useEffect(() => {
    if (user) fetchIce();
  }, [user, fetchIce]);

  const getLocalStream = useCallback(
    async (type) => {
      if (localRef.current) return localRef.current;
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints(type));
      localRef.current = stream;
      setLocalStream(stream);
      return stream;
    },
    []
  );

  const createPeer = useCallback(
    async (type) => {
      if (pcRef.current) return pcRef.current;

      const pc = new RTCPeerConnection(iceConfig.current);
      const stream = await getLocalStream(type);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const remote = new MediaStream();
      setRemoteStream(remote);

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          if (!remote.getTracks().some((t) => t.id === track.id)) remote.addTrack(track);
        });
        setRemoteStream(new MediaStream(remote.getTracks()));
        setPhase((current) => (current === 'active' ? current : 'active'));
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate || !callRef.current) return;
        const peerId = callRef.current.callerId === user.id ? callRef.current.calleeId : callRef.current.callerId;
        emitAsync('call:signal', {
          callId: callRef.current.id,
          targetUserId: peerId,
          signal: { candidate: event.candidate },
        }).catch(() => {});
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          setError('Connection lost. Check your network and try again.');
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [getLocalStream, user]
  );

  const startTicking = useCallback(() => {
    clearTimer();
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((value) => value + 1), 1000);
  }, []);

  const applySignal = useCallback(
    async (signal) => {
      const pc = pcRef.current;
      if (!pc || !signal) return;

      if (signal.candidate) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(signal.candidate).catch(() => {});
        } else {
          pendingCandidates.current.push(signal.candidate);
        }
        return;
      }

      if (signal.type === 'offer') {
        await pc.setRemoteDescription(signal);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const active = callRef.current;
        emitAsync('call:signal', {
          callId: active.id,
          targetUserId: active.callerId,
          signal: { type: answer.type, sdp: answer.sdp },
        }).catch(() => {});
        setPhase('active');
        startTicking();
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(signal);
        const queued = pendingCandidates.current;
        pendingCandidates.current = [];
        for (const candidate of queued) {
          await pc.addIceCandidate(candidate).catch(() => {});
        }
        setPhase('active');
        startTicking();
      }
    },
    [startTicking]
  );

  const startCall = useCallback(
    async (targetUser, type = 'audio', conversationId = null) => {
      if (!targetUser?.id || callRef.current) return;
      setError('');
      setMediaType(type);

      try {
        const stream = await getLocalStream(type);
        setLocalStream(stream);
      } catch {
        setError('Camera or microphone permission was denied.');
        return;
      }

      try {
        const response = await emitAsync('call:start', {
          calleeId: targetUser.id,
          type,
          conversationId,
        });
        setActiveCall(response.call);
        setPhase('outgoing');
      } catch (err) {
        stopMedia();
        setError(err.message);
      }
    },
    [getLocalStream, stopMedia]
  );

  const acceptCall = useCallback(async () => {
    if (!callRef.current) return;
    const active = callRef.current;
    try {
      const response = await emitAsync('call:accept', { callId: active.id });
      setActiveCall(response.call);
      setPhase('connecting');
      await createPeer(active.type);
    } catch (err) {
      setError(err.message);
      reset();
    }
  }, [createPeer, reset]);

  const rejectCall = useCallback(async () => {
    if (!callRef.current) return;
    const active = callRef.current;
    try {
      await emitAsync('call:reject', { callId: active.id });
    } catch {
      /* the caller already hung up */
    }
    reset();
  }, [reset]);

  const endCall = useCallback(async () => {
    const active = callRef.current;
    if (!active) return;
    try {
      await emitAsync('call:end', { callId: active.id, durationSeconds: duration });
    } catch {
      /* ignore */
    }
    reset();
  }, [duration, reset]);

  const toggleMute = useCallback(() => {
    const tracks = localRef.current?.getAudioTracks() ?? [];
    const next = !muted;
    tracks.forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const tracks = localRef.current?.getVideoTracks() ?? [];
    const next = !cameraOff;
    tracks.forEach((track) => {
      track.enabled = !next;
    });
    setCameraOff(next);
  }, [cameraOff]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !token) return undefined;

    const onIncoming = ({ call: incoming }) => {
      if (callRef.current) {
        emitAsync('call:reject', { callId: incoming.id }).catch(() => {});
        return;
      }
      setActiveCall(incoming);
      setMediaType(incoming.type);
      setPhase('incoming');
      setError('');
    };

    const onAccepted = async ({ call: accepted }) => {
      setActiveCall(accepted);
      setPhase('connecting');
      try {
        const pc = await createPeer(accepted.type);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        emitAsync('call:signal', {
          callId: accepted.id,
          targetUserId: accepted.calleeId,
          signal: { type: offer.type, sdp: offer.sdp },
        }).catch((err) => setError(err.message));
      } catch {
        setError('Could not connect the call.');
      }
    };

    const onSignal = ({ signal }) => applySignal(signal).catch(() => {});

    const onPeerEnded = () => {
      setPhase('ended');
      teardown();
      setTimeout(() => reset('Call ended'), 900);
    };

    const onRejected = () => reset('Call declined');
    const onNoAnswer = () => reset('No answer');
    const onCancelled = () => reset('Call cancelled');

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:signal', onSignal);
    socket.on('call:ended', onPeerEnded);
    socket.on('call:rejected', onRejected);
    socket.on('call:no-answer', onNoAnswer);
    socket.on('call:cancelled', onCancelled);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:signal', onSignal);
      socket.off('call:ended', onPeerEnded);
      socket.off('call:rejected', onRejected);
      socket.off('call:no-answer', onNoAnswer);
      socket.off('call:cancelled', onCancelled);
    };
  }, [token, createPeer, applySignal, teardown, reset]);

  useEffect(() => () => teardown(), [teardown]);

  const peerUser = call ? (call.callerId === user?.id ? call.callee : call.caller) : null;
  const direction = call ? (call.callerId === user?.id ? 'outgoing' : 'incoming') : null;

  return (
    <CallContext.Provider
      value={{
        call,
        peerUser,
        direction,
        phase,
        mediaType,
        localStream,
        remoteStream,
        muted,
        cameraOff,
        duration,
        error,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used inside CallProvider');
  return context;
};
