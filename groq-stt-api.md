> Integrate Groq's fast speech-to-text API for instant audio transcription and translation in your appl......

Groq API is the fastest speech-to-text solution available, offering OpenAI-compatible endpoints that enable near-instant transcriptions and translations. With Groq API, you can integrate high-quality audio processing into your applications at speeds that rival human interaction.

[API Endpoints](#api-endpoints)
-------------------------------

We support two endpoints:

<table><thead><tr><th>Endpoint</th><th>Usage</th><th>API Endpoint</th></tr></thead><tbody><tr><td>Transcriptions</td><td>Convert audio to text</td><td><code>https://api.groq.com/openai/v1/audio/transcriptions</code></td></tr><tr><td>Translations</td><td>Translate audio to English text</td><td><code>https://api.groq.com/openai/v1/audio/translations</code></td></tr></tbody></table>

[Supported Models](#supported-models)
-------------------------------------

<table><thead><tr><th>Model ID</th><th>Model</th><th>Supported Language(s)</th><th>Description</th></tr></thead><tbody><tr><td><p><code>whisper-large-v3-turbo</code></p></td><td><a href="https://console.groq.com/docs/model/whisper-large-v3-turbo">Whisper Large V3 Turbo</a></td><td>Multilingual</td><td>A fine-tuned version of a pruned Whisper Large V3 designed for fast, multilingual transcription tasks.</td></tr><tr><td><p><code>whisper-large-v3</code></p></td><td><a href="https://console.groq.com/docs/model/whisper-large-v3">Whisper Large V3</a></td><td>Multilingual</td><td>Provides state-of-the-art performance with high accuracy for multilingual transcription and translation tasks.</td></tr></tbody></table>

[Which Whisper Model Should You Use?](#which-whisper-model-should-you-use)
--------------------------------------------------------------------------

Having more choices is great, but let's try to avoid decision paralysis by breaking down the tradeoffs between models to find the one most suitable for your applications:

*   If your application is error-sensitive and requires multilingual support, use .
*   If your application requires multilingual support and you need the best price for performance, use .

The following table breaks down the metrics for each model.

<table><thead><tr><th>Model</th><th>Cost Per Hour</th><th>Language Support</th><th>Transcription Support</th><th>Translation Support</th><th>Real-time Speed Factor</th><th>Word Error Rate</th></tr></thead><tbody><tr><td><p><code>whisper-large-v3</code></p></td><td>$0.111</td><td>Multilingual</td><td>Yes</td><td>Yes</td><td>189</td><td>10.3%</td></tr><tr><td><p><code>whisper-large-v3-turbo</code></p></td><td>$0.04</td><td>Multilingual</td><td>Yes</td><td>No</td><td>216</td><td>12%</td></tr></tbody></table>

[Working with Audio Files](#working-with-audio-files)
-----------------------------------------------------

### Audio File Limitations

Max File Size

25 MB (free tier), 100MB (dev tier)

Max Attachment File Size

25 MB. If you need to process larger files, use the `url` parameter to specify a url to the file instead.

Minimum File Length

0.01 seconds

Minimum Billed Length

10 seconds. If you submit a request less than this, you will still be billed for 10 seconds.

Supported File Types

Either a URL or a direct file upload for `flac`, `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `ogg`, `wav`, `webm`

Single Audio Track

Only the first track will be transcribed for files with multiple audio tracks. (e.g. dubbed video)

Supported Response Formats

`json`, `verbose_json`, `text`

Supported Timestamp Granularities

`segment`, `word`

### [Audio Preprocessing](#audio-preprocessing)

Our speech-to-text models will downsample audio to 16KHz mono before transcribing, which is optimal for speech recognition. This preprocessing can be performed client-side if your original file is extremely large and you want to make it smaller without a loss in quality (without chunking, Groq API speech-to-text endpoints accept up to 25MB for free tier and 100MB for [dev tier](https://console.groq.com/settings/billing)). For lower latency, convert your files to `wav` format. When reducing file size, we recommend FLAC for lossless compression.

The following `ffmpeg` command can be used to reduce file size:

```
ffmpeg \
  -i <your file> \
  -ar 16000 \
  -ac 1 \
  -map 0:a \
  -c:a flac \
  <output file name>.flac

```

### [Working with Larger Audio Files](#working-with-larger-audio-files)

For audio files that exceed our size limits or require more precise control over transcription, we recommend implementing audio chunking. This process involves:

1.  Breaking the audio into smaller, overlapping segments
2.  Processing each segment independently
3.  Combining the results while handling overlapping

[To learn more about this process and get code for your own implementation, see the complete audio chunking tutorial in our Groq API Cookbook.](https://github.com/groq/groq-api-cookbook/tree/main/tutorials/audio-chunking)

[Using the API](#using-the-api)
-------------------------------

The following are request parameters you can use in your transcription and translation requests:

<table><thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td><code>file</code></td><td><code>string</code></td><td>Required unless using <code>url</code> instead</td><td>The audio file object for direct upload to translate/transcribe.</td></tr><tr><td><code>url</code></td><td><code>string</code></td><td>Required unless using <code>file</code> instead</td><td>The audio URL to translate/transcribe (supports Base64URL).</td></tr><tr><td><code>language</code></td><td><code>string</code></td><td>Optional</td><td>The language of the input audio. Supplying the input language in ISO-639-1 (i.e. <code>en, </code>tr`) format will improve accuracy and latency.<p>The translations endpoint only supports 'en' as a parameter option.</p></td></tr><tr><td><code>model</code></td><td><code>string</code></td><td>Required</td><td>ID of the model to use.</td></tr><tr><td><code>prompt</code></td><td><code>string</code></td><td>Optional</td><td>Prompt to guide the model's style or specify how to spell unfamiliar words. (limited to 224 tokens)</td></tr><tr><td><code>response_format</code></td><td><code>string</code></td><td>json</td><td>Define the output response format.<p>Set to <code>verbose_json</code> to receive timestamps for audio segments.</p><p>Set to <code>text</code> to return a text response.</p></td></tr><tr><td><code>temperature</code></td><td><code>float</code></td><td>0</td><td>The temperature between 0 and 1. For translations and transcriptions, we recommend the default value of 0.</td></tr><tr><td><code>timestamp_granularities[]</code></td><td><code>array</code></td><td>segment</td><td>The timestamp granularities to populate for this transcription. <code>response_format</code> must be set <code>verbose_json</code> to use timestamp granularities.<p>Either or both of <code>word</code> and <code>segment</code> are supported.</p><p><code>segment</code> returns full metadata and <code>word</code> returns only word, start, and end timestamps. To get both word-level timestamps and full segment metadata, include both values in the array.</p></td></tr></tbody></table>

### [Example Usage of Transcription Endpoint](#example-usage-of-transcription-endpoint)

The transcription endpoint allows you to transcribe spoken words in audio or video files.

The Groq SDK package can be installed using the following command:

The following code snippet demonstrates how to use Groq API to transcribe an audio file in Python:

```
1import os
2import json
3from groq import Groq
4
5# Initialize the Groq client
6client = Groq()
7
8# Specify the path to the audio file
9filename = os.path.dirname(__file__) + "/YOUR_AUDIO.wav" # Replace with your audio file!
10
11# Open the audio file
12with open(filename, "rb") as file:
13    # Create a transcription of the audio file
14    transcription = client.audio.transcriptions.create(
15      file=file, # Required audio file
16      model="whisper-large-v3-turbo", # Required model to use for transcription
17      prompt="Specify context or spelling",  # Optional
18      response_format="verbose_json",  # Optional
19      timestamp_granularities = ["word", "segment"], # Optional (must set response_format to "json" to use and can specify "word", "segment" (default), or both)
20      language="en",  # Optional
21      temperature=0.0  # Optional
22    )
23    # To print only the transcription text, you'd use print(transcription.text) (here we're printing the entire transcription object to access timestamps)
24    print(json.dumps(transcription, indent=2, default=str))

```

### [Example Usage of Translation Endpoint](#example-usage-of-translation-endpoint)

The translation endpoint allows you to translate spoken words in audio or video files to English.

The Groq SDK package can be installed using the following command:

The following code snippet demonstrates how to use Groq API to translate an audio file in Python:

```
1import os
2from groq import Groq
3
4# Initialize the Groq client
5client = Groq()
6
7# Specify the path to the audio file
8filename = os.path.dirname(__file__) + "/sample_audio.m4a" # Replace with your audio file!
9
10# Open the audio file
11with open(filename, "rb") as file:
12    # Create a translation of the audio file
13    translation = client.audio.translations.create(
14      file=(filename, file.read()), # Required audio file
15      model="whisper-large-v3", # Required model to use for translation
16      prompt="Specify context or spelling",  # Optional
17      language="en", # Optional ('en' only)
18      response_format="json",  # Optional
19      temperature=0.0  # Optional
20    )
21    # Print the translation text
22    print(translation.text)

```

[Understanding Metadata Fields](#understanding-metadata-fields)
---------------------------------------------------------------

When working with Groq API, setting `response_format` to `verbose_json` outputs each segment of transcribed text with valuable metadata that helps us understand the quality and characteristics of our transcription, including `avg_logprob`, `compression_ratio`, and `no_speech_prob`.

This information can help us with debugging any transcription issues. Let's examine what this metadata tells us using a real example:

```
{
  "id": 8,
  "seek": 3000,
  "start": 43.92,
  "end": 50.16,
  "text": " document that the functional specification that you started to read through that isn't just the",
  "tokens": [51061, 4166, 300, 264, 11745, 31256],
  "temperature": 0,
  "avg_logprob": -0.097569615,
  "compression_ratio": 1.6637554,
  "no_speech_prob": 0.012814695
}

```

As shown in the above example, we receive timing information as well as quality indicators. Let's gain a better understanding of what each field means:

*   `id:8`: The 9th segment in the transcription (counting begins at 0)
*   `seek`: Indicates where in the audio file this segment begins (3000 in this case)
*   `start` and `end` timestamps: Tell us exactly when this segment occurs in the audio (43.92 to 50.16 seconds in our example)
*   `avg_logprob` (Average Log Probability): -0.097569615 in our example indicates very high confidence. Values closer to 0 suggest better confidence, while more negative values (like -0.5 or lower) might indicate transcription issues.
*   `no_speech_prob` (No Speech Probability): 0.0.012814695 is very low, suggesting this is definitely speech. Higher values (closer to 1) would indicate potential silence or non-speech audio.
*   `compression_ratio`: 1.6637554 is a healthy value, indicating normal speech patterns. Unusual values (very high or low) might suggest issues with speech clarity or word boundaries.

### [Using Metadata for Debugging](#using-metadata-for-debugging)

When troubleshooting transcription issues, look for these patterns:

*   Low Confidence Sections: If `avg_logprob` drops significantly (becomes more negative), check for background noise, multiple speakers talking simultaneously, unclear pronunciation, and strong accents. Consider cleaning up the audio in these sections or adjusting chunk sizes around problematic chunk boundaries.
*   Non-Speech Detection: High `no_speech_prob` values might indicate silence periods that could be trimmed, background music or noise, or non-verbal sounds being misinterpreted as speech. Consider noise reduction when preprocessing.
*   Unusual Speech Patterns: Unexpected `compression_ratio` values can reveal stuttering or word repetition, speaker talking unusually fast or slow, or audio quality issues affecting word separation.

### [Quality Thresholds and Regular Monitoring](#quality-thresholds-and-regular-monitoring)

We recommend setting acceptable ranges for each metadata value we reviewed above and flagging segments that fall outside these ranges to be able to identify and adjust preprocessing or chunking strategies for flagged sections.

By understanding and monitoring these metadata values, you can significantly improve your transcription quality and quickly identify potential issues in your audio processing pipeline.

### [Prompting Guidelines](#prompting-guidelines)

The prompt parameter (max 224 tokens) helps provide context and maintain a consistent output style. Unlike chat completion prompts, these prompts only guide style and context, not specific actions.

Best Practices

*   Provide relevant context about the audio content, such as the type of conversation, topic, or speakers involved.
*   Use the same language as the language of the audio file.
*   Steer the model's output by denoting proper spellings or emulate a specific writing style or tone.
*   Keep the prompt concise and focused on stylistic guidance.

We can't wait to see what you build! 🚀