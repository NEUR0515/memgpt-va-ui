import pygame
import time
import tempfile
from os.path import join, dirname
from dotenv import load_dotenv
import speech_recognition as sr
from google.cloud import texttospeech

# Instantiates a client
tts_client = texttospeech.TextToSpeechClient()

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
        
# Function to convert text to speech using Google TTS and play it
def say(message: str):
    try:
        # Validate that the message is a non-empty string
        if not isinstance(message, str) or not message.strip():
            raise ValueError("Invalid or empty message passed to the TTS function")

        # Create a temporary file for storing the audio
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=True) as temp_file:
            temp_filename = temp_file.name
        
        # Create a synthesis request for Google TTS
        synthesis_input = texttospeech.SynthesisInput(text=message)

        # Select the voice and audio encoding
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-GB", ssml_gender=texttospeech.SsmlVoiceGender.MALE
        )

        # Set the audio configuration (MP3 format)
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        # Synthesize the speech and get the response
        response = tts_client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )

        # Save the synthesized audio to a temporary file
        with open(temp_filename, "wb") as f:
            f.write(response.audio_content)

        # Stop and quit pygame mixer if it was already playing
        if pygame.mixer.get_init() and pygame.mixer.music.get_busy():
            pygame.mixer.music.stop()
        pygame.mixer.quit()

        # Play the audio using pygame
        play_audio(temp_filename)

    except ValueError as ve:
        print(f"Validation error: {ve}")
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
