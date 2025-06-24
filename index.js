import * as Tonal from "https://cdn.skypack.dev/@tonaljs/tonal";
import { PitchDetector } from 'https://esm.sh/pitchy@4';

const noteName = document.getElementById("note-span")
const allNotes = document.getElementById("all-notes")
const freqDiv = document.getElementById("freq")

let detectedNotes = []

document.getElementById('input').addEventListener("click", async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: {
            echoCancellation:true,
            autoGainControl:true,
            noiseSuppression:true
        } })
        const context = new AudioContext();
        const mic = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        mic.connect(analyser);

        const buffer = new Float32Array(analyser.fftSize);
        const detector = PitchDetector.forFloat32Array(analyser.fftSize);

        let lastStableNote = null;
        let noteBuffer = []; // small buffer to store last few frames
        const bufferSize = 5;

        let lastTime = 0;

        function stopMic(){
            if(stream){
                stream.getTracks().forEach(track=>track.stop())
                console.log("mic stopped")
            }
            if(context && context.state!=="closed"){
                context.close()
                .then(()=>{
                    console.log("audio context closed")
                })
            }
        }
        document.getElementById("stop").addEventListener("click",stopMic)
        function addNote(note){
            const now = Date.now();
            const noteTimeGap = now - lastTime;

            const isSameNote = note === lastStableNote;
            const enoughTimePassed = noteTimeGap >= 500;
        
            if ((isSameNote && enoughTimePassed) || (!isSameNote)) {
                detectedNotes.push(note);
                lastStableNote = note;
                lastTime = now;
                allNotes.textContent = detectedNotes.join(" ");
            }
        }

        function analyzeLoop() {
            analyser.getFloatTimeDomainData(buffer)
            const [pitch, clarity] = detector.findPitch(buffer, context.sampleRate)

            // console.log(pitch)
            const roundedPitch = Math.round(pitch)
            
            if (clarity >= 0.9 && pitch > 50) {
                console.log(pitch)
                console.log(roundedPitch)
                

                const note = Tonal.Note.fromFreq(roundedPitch);
                noteBuffer.push(note);

                if (noteBuffer.length > bufferSize) noteBuffer.shift();

                // Check if the same note has appeared multiple times
                const mostCommon = noteBuffer.sort((a, b) =>
                    noteBuffer.filter(v => v === a).length - noteBuffer.filter(v => v === b).length
                ).pop();

                if (mostCommon !== lastStableNote) {
                    noteName.innerText = mostCommon;
                    freqDiv.textContent = roundedPitch;
                    addNote(mostCommon);
                }
            }

            requestAnimationFrame(analyzeLoop)
        }

        analyzeLoop()
    } catch (error) {
        console.log(error)
    }
})

document.getElementById('clear').onclick = () => {
    detectedNotes = [];
    allNotes.textContent = '';
    
}
