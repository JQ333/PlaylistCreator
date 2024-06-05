// Initialize AudioContext for Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)()

// Replace these placeholders with your actual API keys
const clientId = "YOUR_SPOTIFY_CLIENT_ID"
const clientSecret = "YOUR_SPOTIFY_CLIENT_SECRET"
const openAiApiKey = "YOUR_OPENAI_API_KEY"

// Event listener for the Generate Playlist button
document.getElementById("generate").addEventListener("click", function () {
    const mood = document.getElementById("mood").value
    generatePlaylist(mood)
})

// Function to obtain Spotify access token
async function getSpotifyToken() {
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
        },
        body: "grant_type=client_credentials",
    })
    const data = await response.json()
    return data.access_token
}

// Function to search for a track on Spotify
async function searchTrack(trackName, token) {
    const response = await fetch(
        `https://api.spotify.com/v1/search?q=${trackName}&type=track`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    )
    const data = await response.json()
    return data.tracks.items[0] // Get the first result
}

// Function to load and decode audio using the Web Audio API
async function loadAudio(url) {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    return audioBuffer
}

// Function to play audio using the Web Audio API
async function playAudio(url) {
    const audioBuffer = await loadAudio(url)
    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContext.destination)
    source.start(0)
}

// Function to generate a playlist based on the user's mood
async function generatePlaylist(mood) {
    // Display loading indicator
    document.getElementById("loading").style.display = "block"

    // Obtain Spotify token
    const token = await getSpotifyToken()

    // Request song recommendations from ChatGPT
    const chatGptResponse = await fetch(
        "https://api.openai.com/v1/engines/davinci-codex/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openAiApiKey}`,
            },
            body: JSON.stringify({
                prompt: `Suggest a playlist of songs for a ${mood} mood.`,
                max_tokens: 150,
            }),
        }
    )
    const chatGptData = await chatGptResponse.json()
    const songs = chatGptData.choices[0].text.split("\n")

    // Process and play each song in the playlist
    for (let song of songs) {
        const track = await searchTrack(song, token)
        if (track) {
            const previewUrl = track.preview_url
            if (previewUrl) {
                playAudio(previewUrl)
                await new Promise((resolve) => setTimeout(resolve, 30000)) // Wait for 30 seconds (length of preview)
            }
        }
    }

    // Hide loading indicator
    document.getElementById("loading").style.display = "none"
}
