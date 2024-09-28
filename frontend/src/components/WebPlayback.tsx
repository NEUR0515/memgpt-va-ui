import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaStepBackward, FaStepForward, FaRandom, FaTv } from 'react-icons/fa'; // Devices icon added
import axios from 'axios';

interface WebPlaybackProps {
  spotifyToken: string;
}

interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

const WebPlayback: React.FC<WebPlaybackProps> = ({ spotifyToken }) => {
  const [player, setPlayer] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState({
    name: '',
    artists: [{ name: '' }],
    album: { images: [{ url: '' }] }
  });
  const [devices, setDevices] = useState<SpotifyDevice[]>([]); // Use SpotifyDevice type here
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isDevicePickerOpen, setIsDevicePickerOpen] = useState(false);
  const devicePickerRef = useRef<HTMLDivElement>(null); // Assigning the correct type

  useEffect(() => {
    const refreshTokenInterval = setInterval(async () => {
        const response = await fetch("/auth/refresh", { method: "POST" });
        const data = await response.json();
        if (data.access_token) {
            localStorage.setItem("spotifyToken", data.access_token); // Save new token in localStorage
        }
    }, 55 * 60 * 1000); // Refresh token after 55 minutes

    return () => clearInterval(refreshTokenInterval);  // Cleanup
}, [spotifyToken]);

  const toggleDevicePicker = async () => {
    setIsDevicePickerOpen(!isDevicePickerOpen);
    if (!isDevicePickerOpen) {
      await fetchDevices();  // Fetch devices only when opening the picker
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (devicePickerRef.current && !devicePickerRef.current.contains(event.target)) {
        setIsDevicePickerOpen(false); // Close the picker when clicking outside
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Jarvis',
        getOAuthToken: (cb: any) => { cb(spotifyToken); },
        volume: 0.5,
      });
      setPlayer(player);
      fetchCurrentPlayback();
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
  }, [spotifyToken]);

  const fetchDevices = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices);  // Use SpotifyDevice type here

        // Check if a device other than the web player is active
        const activeDevice = data.devices.find((device: SpotifyDevice) => device.is_active);
        if (activeDevice && activeDevice.id !== selectedDevice) {
          setSelectedDevice(activeDevice.id);
        }
      } else {
        console.error('Failed to fetch devices:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [spotifyToken]);

  const transferPlayback = async (deviceId: string) => {
    setIsLoading(true);  // Show loading spinner
    try {
       await axios.put(
          'https://api.spotify.com/v1/me/player',
          { device_ids: [deviceId], play: true },
          { headers: { Authorization: `Bearer ${spotifyToken}` } }
       );
       setSelectedDevice(deviceId);
       fetchCurrentPlayback();
    } catch (error) {
       console.error("Error switching device:", error);
    } finally {
       setIsLoading(false);  // Hide loading spinner
    }
  };
  const fetchCurrentPlayback = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
        },
      });
  
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.item) {
          setCurrentTrack(data.item);  // Update the currently playing track
          setIsPaused(!data.is_playing);  // Update the paused state
        } else {
          console.warn("No active playback detected.");
        }
      } else {
        console.error('Failed to fetch current playback:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching current playback:', error);
    }
  };

  const handlePlaybackControl = async (action: 'play' | 'pause' | 'next' | 'previous') => {
    const endpoint = {
      play: 'https://api.spotify.com/v1/me/player/play',
      pause: 'https://api.spotify.com/v1/me/player/pause',
      next: 'https://api.spotify.com/v1/me/player/next',
      previous: 'https://api.spotify.com/v1/me/player/previous'
    };
  
    const method = (action === 'play' || action === 'pause') ? 'put' : 'post';
  
    try {
      await axios({
        method: method,
        url: endpoint[action],
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
        },
      });
  
      // Fetch the current playback state after taking action
      fetchCurrentPlayback();
    } catch (error) {
      console.error(`Error performing ${action} action:`, error);
    }
  };
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      right: '20px', 
      backgroundColor: '#282828', 
      color: 'white', 
      padding: '15px', 
      borderRadius: '8px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      width: '400px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    }}>
      <img 
        src={currentTrack?.album?.images?.[0]?.url || '/img/logo.png'} 
        alt="Album Cover" 
        style={{ width: '50px', height: '50px', borderRadius: '4px' }} 
      />
      <div style={{ marginLeft: '10px', flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {currentTrack?.name || 'Unknown Track'}
        </div>
        <div style={{ fontSize: '12px', color: 'grey' }}>
          {currentTrack?.artists?.[0]?.name || 'Unknown Artist'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '120px' }}>
        <FaRandom style={{ color: 'white', cursor: 'pointer' }} onClick={() => {/* Shuffle function */}} />
        <FaStepBackward style={{ color: 'white', cursor: 'pointer' }} onClick={() => handlePlaybackControl('previous')} />
        <button onClick={() => handlePlaybackControl(isPaused ? 'play' : 'pause')} style={{ backgroundColor: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
        {isPaused ? <FaPlay /> : <FaPause />}
        </button>
        <FaStepForward style={{ color: 'white', cursor: 'pointer' }} onClick={() => handlePlaybackControl('next')} />
        <FaTv 
          style={{ color: 'white', cursor: 'pointer' }} 
          onClick={toggleDevicePicker} // Fetch devices when clicked
        />
      </div>

      {/* Display available devices */}
      {isDevicePickerOpen && devices.length > 0 && (
        <div 
          ref={devicePickerRef}
          style={{ 
            position: 'absolute', 
            bottom: '60px', 
            right: '0', 
            backgroundColor: '#333', 
            padding: '10px', 
            borderRadius: '8px', 
            zIndex: 1000 // Ensure it's above other content
          }}>
          {devices.map((device: SpotifyDevice) => (
            <div 
              key={device.id} 
              style={{ padding: '5px', cursor: 'pointer', color: device.id === selectedDevice ? 'green' : 'white' }}
              onClick={() => transferPlayback(device.id)}>
              {device.name} {device.is_active && "(Active)"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WebPlayback;
