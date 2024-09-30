// WebPlayback.tsx
import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaStepBackward, FaStepForward, FaRandom, FaTv } from 'react-icons/fa';
import axios from 'axios';
import { useToast } from '@chakra-ui/react';

// Declare Spotify in the global window object
declare global {
  interface Window {
    Spotify: any;
  }
}

interface WebPlaybackProps {
  fetchSpotifyToken: () => Promise<string>;
}

interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

interface SpotifyPlayer {
  addListener: (event: string, callback: Function) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
}

interface SpotifyPlayerState {
  track_window: {
    current_track: SpotifyTrack;
  };
  paused: boolean;
}

interface SpotifyTrack {
  name: string;
  artists: Array<{ name: string }>;
  album: {
    images: Array<{ url: string }>;
  };
}

const WebPlayback: React.FC<WebPlaybackProps> = ({ fetchSpotifyToken }) => {
  const [player, setPlayer] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isDevicePickerOpen, setIsDevicePickerOpen] = useState(false);
  const devicePickerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Utility function to extract error messages
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    } else if (typeof error === 'string') {
      return error;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      return (error as any).message;
    } else {
      return 'An unexpected error occurred';
    }
  };

  // Toggle device picker visibility
  const toggleDevicePicker = async () => {
    setIsDevicePickerOpen(!isDevicePickerOpen);
    if (!isDevicePickerOpen) {
      await fetchDevices(); // Fetch devices when opening the picker
    }
  };

  // Close device picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (devicePickerRef.current && !devicePickerRef.current.contains(event.target as Node)) {
        setIsDevicePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize Spotify Player
  useEffect(() => {
    const initializePlayer = async () => {
      try {
        const token = await fetchSpotifyToken();
        if (!token) {
          console.error('Spotify token is not available.');
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);

        script.onload = () => {
          if (!window.Spotify) {
            console.error('Spotify SDK failed to load.');
            toast({
              title: 'Spotify SDK Error',
              description: 'Failed to load Spotify SDK.',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            return;
          }

          const player = new window.Spotify.Player({
            name: 'Jarvis',
            getOAuthToken: async (cb: any) => {
              const newToken = await fetchSpotifyToken();
              cb(newToken);
            },
            volume: 0.5,
          });

          setPlayer(player);

          player.addListener('ready', ({ device_id }: { device_id: string }) => {
            console.log('Ready with Device ID', device_id);
            setSelectedDevice(device_id);
            transferPlayback(device_id, false); // Do not auto-play
          });

          player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
            console.log('Device ID has gone offline', device_id);
          });

          player.addListener('player_state_changed', (state: any) => {
            if (!state) return;
            setCurrentTrack(state.track_window.current_track);
            setIsPaused(state.paused);
          });

          player.addListener('initialization_error', ({ message }: { message: string }) => {
            const errorMessage = getErrorMessage(message);
            console.error('Initialization Error:', errorMessage);
            toast({
              title: 'Initialization Error',
              description: errorMessage,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          });

          player.addListener('authentication_error', ({ message }: { message: string }) => {
            const errorMessage = getErrorMessage(message);
            console.error('Authentication Error:', errorMessage);
            toast({
              title: 'Authentication Error',
              description: errorMessage,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          });

          player.addListener('account_error', ({ message }: { message: string }) => {
            const errorMessage = getErrorMessage(message);
            console.error('Account Error:', errorMessage);
            toast({
              title: 'Account Error',
              description: errorMessage,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          });

          player.addListener('playback_error', ({ message }: { message: string }) => {
            const errorMessage = getErrorMessage(message);
            console.error('Playback Error:', errorMessage);
            toast({
              title: 'Playback Error',
              description: errorMessage,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          });

          player.connect();
        };
      } catch (error) {
        const message = getErrorMessage(error);
        console.error('Error initializing Spotify Player:', message);
        toast({
          title: 'Spotify Player Error',
          description: 'An error occurred while initializing the Spotify Player.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    initializePlayer();

    return () => {
      if (player) {
        player.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch user's available devices
  const fetchDevices = async () => {
    try {
      const token = await fetchSpotifyToken();
      if (!token) {
        throw new Error('Spotify token is not available.');
      }
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices);

        if (data.devices.length === 0) {
          toast({
            title: 'No Active Devices',
            description: 'Please open Spotify on a device to use the Web Playback SDK.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        }

        const activeDevice = data.devices.find((device: SpotifyDevice) => device.is_active);
        if (activeDevice) {
          setSelectedDevice(activeDevice.id);
        }
      } else {
        const errorText = await response.text();
        const errorMessage = getErrorMessage(errorText);
        console.error('Failed to fetch devices:', response.status, errorMessage);
        toast({
          title: 'Error Fetching Devices',
          description: 'Unable to retrieve Spotify devices.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });

        if (response.status === 401 || response.status === 403) {
          // Token is invalid or expired, redirect to login
          window.location.href = '/auth/login';
        }
      }
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Error fetching devices:', message);
      toast({
        title: 'Error Fetching Devices',
        description: 'An error occurred while fetching devices.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Transfer playback to selected device
  const transferPlayback = async (deviceId: string, shouldPlay: boolean = true) => {
    setIsLoading(true);
    try {
      const token = await fetchSpotifyToken();
      if (!token) {
        throw new Error('Spotify token is not available.');
      }
      await axios.put(
        'https://api.spotify.com/v1/me/player/play',
        { device_ids: [deviceId], play: shouldPlay },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSelectedDevice(deviceId);
      fetchCurrentPlayback();
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Error transferring playback:', message);
      toast({
        title: 'Playback Transfer Error',
        description: 'Unable to transfer playback to the selected device.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

      if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
        // Token is invalid or expired, redirect to login
        window.location.href = '/auth/login';
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch current playback state
  const fetchCurrentPlayback = async () => {
    try {
      const token = await fetchSpotifyToken();
      if (!token) {
        throw new Error('Spotify token is not available.');
      }
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.item) {
          setCurrentTrack(data.item);
          setIsPaused(!data.is_playing);
        }
      } else {
        const errorText = await response.text();
        const errorMessage = getErrorMessage(errorText);
        console.error('Failed to fetch current playback:', response.status, errorMessage);
        toast({
          title: 'Error Fetching Playback',
          description: 'Unable to retrieve current playback state.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });

        if (response.status === 401 || response.status === 403) {
          // Token is invalid or expired, redirect to login
          window.location.href = '/auth/login';
        }
      }
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Error fetching current playback:', message);
      toast({
        title: 'Error Fetching Playback',
        description: 'An error occurred while fetching playback state.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle playback controls
  const handlePlaybackControl = async (action: 'play' | 'pause' | 'next' | 'previous') => {
    try {
      const token = await fetchSpotifyToken();
      if (!token) {
        throw new Error('Spotify token is not available.');
      }
      const endpointMap = {
        play: 'https://api.spotify.com/v1/me/player/play',
        pause: 'https://api.spotify.com/v1/me/player/pause',
        next: 'https://api.spotify.com/v1/me/player/next',
        previous: 'https://api.spotify.com/v1/me/player/previous',
      };
      const method = action === 'play' || action === 'pause' ? 'put' : 'post';

      await axios({
        method: method,
        url: endpointMap[action],
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchCurrentPlayback();
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Error performing ${action} action:`, message);
      toast({
        title: 'Playback Control Error',
        description: `Unable to perform ${action} action.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

      if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
        // Token is invalid or expired, redirect to login
        window.location.href = '/auth/login';
      }
    }
  };

  return (
    <div
      style={{
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
      }}
    >
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '150px',
        }}
      >
        <FaRandom
          style={{ color: 'white', cursor: 'pointer' }}
          onClick={() => {
            /* Shuffle functionality can be added here */
          }}
        />
        <FaStepBackward
          style={{ color: 'white', cursor: 'pointer' }}
          onClick={() => handlePlaybackControl('previous')}
        />
        <button
          onClick={() => handlePlaybackControl(isPaused ? 'play' : 'pause')}
          style={{ backgroundColor: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
        >
          {isPaused ? <FaPlay /> : <FaPause />}
        </button>
        <FaStepForward
          style={{ color: 'white', cursor: 'pointer' }}
          onClick={() => handlePlaybackControl('next')}
        />
        <FaTv style={{ color: 'white', cursor: 'pointer' }} onClick={toggleDevicePicker} />
      </div>

      {/* Device Picker */}
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
            zIndex: 1000,
          }}
        >
          {devices.map((device: SpotifyDevice) => (
            <div
              key={device.id}
              style={{
                padding: '5px',
                cursor: 'pointer',
                color: device.id === selectedDevice ? 'green' : 'white',
              }}
              onClick={() => transferPlayback(device.id)}
            >
              {device.name} {device.is_active && '(Active)'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WebPlayback;
