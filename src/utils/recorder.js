export class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
    }

    isRecording() {
        return this.mediaRecorder?.state === 'recording';
    }

    async start() {
        try {
            if (this.isRecording()) return;

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
        if (!this.mediaRecorder) {
            return Promise.reject(new Error('Recorder not initialized'));
        }

        return new Promise((resolve, reject) => {
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);

                if (this.stream) {
                    this.stream.getTracks().forEach((track) => track.stop());
                }

                this.mediaRecorder = null;
                this.stream = null;
                this.audioChunks = [];

                resolve({ blob: audioBlob, url: audioUrl });
                console.log("Recording stopped");
            };

            this.mediaRecorder.onerror = (event) => {
                reject(event.error || new Error('Recording error'));
            };

            this.mediaRecorder.stop();
        });
    }
}
