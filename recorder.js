export class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
    }

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.start();
            console.log("Recording started");
        } catch (err) {
            console.error("Error accessing microphone:", err);
            throw err;
        }
    }

    stop() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);

                // Stop all tracks to release the microphone
                this.stream.getTracks().forEach(track => track.stop());

                resolve({ blob: audioBlob, url: audioUrl });
                console.log("Recording stopped");
            };
            this.mediaRecorder.stop();
        });
    }
}
