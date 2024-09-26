import pygame
import os
import time
import re
import tempfile
from os.path import join, dirname
from dotenv import load_dotenv
import speech_recognition as sr
from memgpt.memory import ChatMemory, MemoryModule
from typing import Optional, List
from elevenlabs import Voice, VoiceSettings, play, save
from elevenlabs.client import ElevenLabs
import uuid

client = ElevenLabs(
    api_key=os.environ.get('ELEVENLABS_API_KEY')
)

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)

# Initialize pygame mixer for audio playback
def play_audio(file_path):
    pygame.mixer.init()
    pygame.mixer.music.load(file_path)
    pygame.mixer.music.play()
    # Wait until the audio is done playing
    while pygame.mixer.music.get_busy():
        time.sleep(1)

def sanitize_for_tts(message: str) -> str:
    # Remove URLs
    sanitized_message = re.sub(r'https?:\/\/[^\s]+', '[link]', message)

    # Remove code blocks (```)
    sanitized_message = re.sub(r'```[\s\S]*?```', '[code]', sanitized_message)

    # Remove inline code (`code`)
    sanitized_message = re.sub(r'`[^`]+`', '[code]', sanitized_message)

    # Add any other sanitization rules if needed

    return sanitized_message

def say(message, filename="output.mp3", index=None):
    try:
        # Ensure the API key is loaded
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise Exception("ELEVENLABS_API_KEY is missing from the environment variables.")

        # Sanitize the message to remove URLs and code
        sanitized_message = sanitize_for_tts(message)

        # Initialize the ElevenLabs client
        client = ElevenLabs(api_key=api_key)

        # Define the voice and its settings
        voice = Voice(
            voice_id="cmiele1eY3uGFqJdZTKJ",  # Use your specific voice ID here
            settings=VoiceSettings(
                stability=0.66,
                similarity_boost=1,
                use_sayer_boost=True
            )
        )

        # Generate the audio using the ElevenLabs API with the sanitized message
        audio = client.generate(
            text=sanitized_message,
            voice=voice,
            model="eleven_multilingual_v2"
        )

        # Stop any current playback and uninitialize pygame to release the file
        if pygame.mixer.get_init() and pygame.mixer.music.get_busy():
            pygame.mixer.music.stop()
        pygame.mixer.quit()  # Fully quit pygame mixer

        # Retry mechanism to ensure the file is not in use before removing it
        retry_count = 0
        while os.path.exists(filename):
            try:
                os.remove(filename)  # Try removing the file
                break  # Exit loop if successful
            except PermissionError:
                retry_count += 1
                if retry_count > 5:  # Stop retrying after 5 attempts
                    raise Exception("File is still in use after multiple retries.")
                time.sleep(1)  # Wait for 1 second before retrying

        # Save the new audio file
        save(audio, filename)

        # Play the audio file after saving
        #play_audio(filename)

    except Exception as e:
        print(f"Error in say() function: {e}")

# Function to listen for voice input
def listen():
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening...")
        r.adjust_for_ambient_noise(source)
        audio = r.listen(source)

    try:
        print("Recognizing...")
        query = r.recognize_google(audio, language='en-GB')
        print(f"You said: {query}")
        return query.lower()
    except sr.UnknownValueError:
        print("Sorry, I didn't understand that.")
        return ""
    except sr.RequestError:
        say("Sorry, my speech service is down.")
        return ""

# Function to listen for the wake word "Jarvis"
def listen_for_wake_word():
    while True:
        query = listen()
        if query:  # Check if a valid query was returned
            if "jarvis" in query:
                say("Yes? How can I help you?")
                return query  # Return the valid query if 'Jarvis' is detected
            elif "exit" in query or "stop" in query:
                say("Okay, goodbye.")
                exit()
        else:
            print("No wake word detected, continuing to listen...")
        time.sleep(0.5)
