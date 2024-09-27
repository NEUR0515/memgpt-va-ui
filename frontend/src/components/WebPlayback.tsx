import React, { useState, useEffect } from 'react';

interface WebPlaybackProps {
  token: string;
}

const WebPlayback: React.FC<WebPlaybackProps> = ({ token }) => {
  const [player, setPlayer] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTrack, setCurrentTrack] = useState({
    name: 'No track playing',
    artists: [{ name: 'Unknown artist' }],
    album: { images: [{ url: 'https://via.placeholder.com/50' }] },
  });

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Spotify Web Player',
        getOAuthToken: (cb: any) => { cb(token); },
        volume: 0.5,
      });

      setPlayer(player);

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Ready with Device ID', device_id);
      });

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id);
      });

      player.connect();
    };

    return () => {
      if (player) player.disconnect();
    };
  }, [token, player]);

  return (
    <div style={containerStyle as React.CSSProperties}>
      <img
        src={currentTrack.album.images[0].url}
        alt="Album Cover"
        style={albumCoverStyle as React.CSSProperties}
      />
      <div style={infoStyle as React.CSSProperties}>
        <div style={trackNameStyle as React.CSSProperties}>{currentTrack.name}</div>
        <div style={artistNameStyle as React.CSSProperties}>{currentTrack.artists[0].name}</div>
      </div>
      <div style={controlsStyle as React.CSSProperties}>
        <button style={controlButtonStyle as React.CSSProperties} onClick={() => player.previousTrack()}>&lt;&lt;</button>
        <button style={controlButtonStyle as React.CSSProperties} onClick={() => player.togglePlay()}>{isPaused ? 'Play' : 'Pause'}</button>
        <button style={controlButtonStyle as React.CSSProperties} onClick={() => player.nextTrack()}>&gt;&gt;</button>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  backgroundColor: '#282828',
  color: 'white',
  padding: '10px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '300px',
  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
};

const albumCoverStyle: React.CSSProperties = {
  width: '50px',
  height: '50px',
  borderRadius: '4px',
};

const infoStyle: React.CSSProperties = {
  marginLeft: '10px',
  flex: 1,
  textAlign: 'left',
};

const trackNameStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const artistNameStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#b3b3b3',
  margin: '0',
};

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginLeft: '10px',
};

const controlButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  margin: '0 5px',
  padding: '5px',
  fontSize: '12px',
};

export default WebPlayback;
