// WebPlayback.tsx
import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaStepBackward, FaStepForward, FaRandom, FaTv } from 'react-icons/fa';
import axios from 'axios';
import { useToast } from '@chakra-ui/react';

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

interface SpotifyTrack {
  name: string;
  artists: Array<{ name: string }>;
  album: {
    images: Array<{ url: string }>;
  };
}

const WebPlayback: React.FC<WebPlaybackProps> = ({ fetchSpotifyToken }) => {
  const [isPaused, setIsPaused] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
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
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCurrentPlayback();
    }, 5000); // Fetch playback state every 5 seconds
  
    return () => clearInterval(interval);
  }, []);
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

  // Check if Spotify account is Premium
  const checkPremium = async () => {
    try {
      const token = await fetchSpotifyToken();
      const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const isPremium = response.data.product === 'premium';
      if (!isPremium) {
        toast({
          title: 'Premium Required',
          description: 'Spotify Premium is required to use playback features.',
          status: 'warning',
          duration: 7000,
          isClosable: true,
        });
        // Optionally, disable playback controls
      }
    } catch (error) {
      console.error('Error checking Spotify account type:', error);
    }
  };

  // Initialize component
  useEffect(() => {
    checkPremium(); // Ensure user has Premium before enabling playback controls
    fetchCurrentPlayback(); // Fetch current playback state on mount
    fetchDevices(); // Fetch available devices on mount
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
            description: 'Please open Spotify on a device to use playback controls.',
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
    try {
      const token = await fetchSpotifyToken();
      if (!token) {
        throw new Error('Spotify token is not available.');
      }
      await axios.put(
        'https://api.spotify.com/v1/me/player',
        { device_ids: [deviceId], play: shouldPlay },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: false, // Ensure credentials are not sent
        }
      );
      setSelectedDevice(deviceId);
      fetchCurrentPlayback();
      toast({
        title: 'Playback Transferred',
        description: `Playback has been transferred to ${deviceId}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
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

  // Handle playback controls using Spotify Web API
  const handlePlaybackControl = async (action: 'play' | 'pause' | 'next' | 'previous') => {
    try {
      const token = await fetchSpotifyToken();
      if (!token) {
        throw new Error('Spotify token is not available.');
      }

      // Fetch the list of devices to get the active device
      const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!devicesResponse.ok) {
        throw new Error('Failed to fetch devices.');
      }

      const devicesData = await devicesResponse.json();
      const activeDevice = devicesData.devices.find((device: SpotifyDevice) => device.is_active);

      if (!activeDevice) {
        throw new Error('No active device found.');
      }

      const endpointMap = {
        play: 'https://api.spotify.com/v1/me/player/play',
        pause: 'https://api.spotify.com/v1/me/player/pause',
        next: 'https://api.spotify.com/v1/me/player/next',
        previous: 'https://api.spotify.com/v1/me/player/previous',
      };

      const methodMap = {
        play: 'PUT',
        pause: 'PUT',
        next: 'POST',
        previous: 'POST',
      };

      await axios({
        method: methodMap[action],
        url: endpointMap[action],
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: action === 'play' ? { device_ids: [activeDevice.id], play: true } : {},
        withCredentials: false,
      });

      fetchCurrentPlayback();
      toast({
        title: 'Success',
        description: `Playback ${action}ed successfully.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
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
            {device.name} ({device.type}) {device.is_active && '(Active)'}
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

export default WebPlayback;
