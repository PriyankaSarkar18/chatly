import { useEffect, useRef } from 'react';
import { PhoneOff, PhoneOutgoing, PhoneIncoming, Video, VideoOff, X } from 'lucide-react';
import { cn, formatDuration } from '../lib/utils';
import Avatar from './ui/Avatar';

const CallOverlay = () => {
  const {
    call,
    peerUser,
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
  } = useCall();

  const outgoingRef = useRef(null);
  const incomingRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    if (call) {
      if (phase === 'outgoing') outgoingRef.current?.focus();
      else if (phase === 'incoming') incomingRef.current?.focus();
      else if (phase === 'active' || phase === 'connecting') activeRef.current?.focus();
    }
  }, [call, phase]);

  if (!call) return null;

  const isVideo = mediaType === 'video';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-app-panel shadow-2xl">
        <header className="flex items-center justify-between border-b border-app-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar user={peerUser || {}} name={call?.callee?.name || call?.caller?.name || 'Person'} size="sm" />
            <div>
              <p className="text-sm font-semibold text-app-text">{call?.callee?.name || 'Incoming call'}</p>
              <p className="text-xs text-app-muted">{isVideo ? 'Video call' : 'Audio call'}</p>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={endCall}>
            <PhoneOff className="h-5 w-5" />
          </button>
        </header>

        <div className="flex aspect-video min-h-0 flex-col p-4">
          {phase === 'outgoing' && (
            <div ref={outgoingRef} className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-semibold text-app-text">Calling…</p>
                <p className="mt-1 text-xs text-app-muted">{peerUser?.name} is answering</p>
                <p className="mt-2 text-xs text-app-faint">{formatDuration(duration)}</p>
              </div>
            </div>
          )}

          {phase === 'incoming' && (
            <div ref={incomingRef} className="flex flex-1 flex-col items-center justify-center">
              <p className="text-sm font-semibold text-app-text">{peerUser?.name} is calling</p>
              <p className="mt-1 text-xs text-app-muted">{isVideo ? 'Video call' : 'Audio call'}</p>
              <div className="mt-6 flex gap-3">
                <button type="button" className="btn-primary" onClick={acceptCall}>
                  Answer
                </button>
                <button type="button" className="btn-ghost" onClick={rejectCall}>
                  Decline
                </button>
              </div>
            </div>
          )}

          {phase === 'connecting' && (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-app-border border-t-app-accent" />
                <span className="text-sm text-app-muted">Connecting…</span>
              </div>
            </div>
          )}

          {phase === 'active' && (
            <div
              ref={activeRef}
              className="flex min-h-0 flex-1 flex-col p-4"
              onContextMenu={(e) => e.preventDefault()}
            >
              <video
                srcObject={remoteStream}
                className="max-h-full max-w-full object-contain"
                muted
                playsInline
              />
              <div className="mt-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button type="button" className="icon-btn" onClick={toggleMute}>
                    {muted ? <PhoneOff className="h-5 w-5" /> : <PhoneIncoming className="h-5 w-5" />}
                  </button>
                  <button type="button" className="icon-btn" onClick={toggleCamera}>
                    {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </button>
                </div>
                <div className="text-xs text-app-muted">{formatDuration(duration)}</div>
              </div>
            </div>
          )}

          {phase === 'ended' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <p className="text-lg font-semibold text-app-text">Call ended</p>
              <p className="text-sm text-app-muted">{error || 'You hung up.'}</p>
              <p className="text-xs text-app-faint">{formatDuration(duration)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;
