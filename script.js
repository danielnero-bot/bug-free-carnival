class TypingTest {
    constructor() {
        this.data = null;
        this.currentDifficulty = 'easy';
        this.currentMode = 'timed';
        this.timerSeconds = 60;
        this.currentTime = 0;
        this.timerInterval = null;
        this.isTestRunning = false;
        
        this.passage = "";
        this.typedText = "";
        this.mistakes = 0;
        this.accuracy = 100;
        this.wpm = 0;
        
        // Ghost Mode & Performance Graph Data
        this.ghostEnabled = false;
        this.wpmHistory = [];
        this.ghostCharIndex = 0;
        
        // Audio
        this.sounds = {
            click: new Audio('https://raw.githubusercontent.com/Miodec/monkeytype/master/static/res/audio/mechanical/cherry/key.wav'),
            error: new Audio('https://raw.githubusercontent.com/Miodec/monkeytype/master/static/res/audio/error.wav')
        };
        // Pre-configure audio
        Object.values(this.sounds).forEach(audio => {
            audio.volume = 0.4;
            audio.load();
        });

        this.personalBest = parseInt(localStorage.getItem('typing_pb')) || 0;
        
        // Dom Elements
        this.elements = {
            pb: document.getElementById('pb-value'),
            currentWpm: document.getElementById('current-wpm'),
            currentAccuracy: document.getElementById('current-accuracy'),
            currentTime: document.getElementById('current-time'),
            passageDisplay: document.getElementById('passage-display'),
            typingInput: document.getElementById('typing-input'),
            
            difficultySelector: document.getElementById('difficulty-selector'),
            modeSelector: document.getElementById('mode-selector'),
            ghostToggle: document.getElementById('ghost-toggle'),
            
            startOverlay: document.getElementById('start-overlay'),
            startBtn: document.getElementById('start-btn'),
            
            resultOverlay: document.getElementById('result-overlay'),
            finalWpm: document.getElementById('final-wpm'),
            finalAccuracy: document.getElementById('final-accuracy'),
            finalCorrect: document.getElementById('final-correct'),
            finalIncorrect: document.getElementById('final-incorrect'),
            pbBadge: document.getElementById('new-pb-badge'),
            goAgainBtn: document.getElementById('go-again-btn'),
            
            restartBtn: document.getElementById('restart-btn-test'),
            canvas: document.getElementById('wpm-graph')
        };
        
        this.init();
    }

    async init() {
        try {
            const response = await fetch('./data.json');
            this.data = await response.json();
            this.setupEventListeners();
            this.updatePBDisplay();
            this.prepareFirstTest();
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    setupEventListeners() {
        // Difficulty selection
        this.elements.difficultySelector.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle')) {
                this.updateSelector(this.elements.difficultySelector, e.target);
                this.currentDifficulty = e.target.dataset.difficulty;
                if (!this.isTestRunning) this.prepareFirstTest();
            }
        });

        // Mode selection
        this.elements.modeSelector.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle')) {
                this.updateSelector(this.elements.modeSelector, e.target);
                this.currentMode = e.target.dataset.mode;
                if (!this.isTestRunning) this.prepareFirstTest();
            }
        });

        // Ghost Mode Toggle
        this.elements.ghostToggle.addEventListener('click', () => {
            this.ghostEnabled = !this.ghostEnabled;
            this.elements.ghostToggle.textContent = this.ghostEnabled ? 'On' : 'Off';
            this.elements.ghostToggle.classList.toggle('active', this.ghostEnabled);
        });

        this.elements.startBtn.addEventListener('click', () => this.activateTest());

        this.elements.passageDisplay.addEventListener('click', () => {
            if (this.elements.startOverlay.style.display !== 'none') {
                this.activateTest();
            } else {
                this.elements.typingInput.focus();
            }
        });

        this.elements.goAgainBtn.addEventListener('click', () => this.showStartScreen());
        this.elements.restartBtn.addEventListener('click', () => this.activateTest());

        // Mobile dropdown toggles
        [this.elements.difficultySelector, this.elements.modeSelector].forEach(selector => {
            selector.addEventListener('click', (e) => {
                if (window.innerWidth <= 600) {
                    if (e.target.classList.contains('active')) {
                        selector.classList.toggle('open');
                    } else if (e.target.classList.contains('toggle')) {
                        selector.classList.remove('open');
                    }
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 600) {
                if (!this.elements.difficultySelector.contains(e.target)) this.elements.difficultySelector.classList.remove('open');
                if (!this.elements.modeSelector.contains(e.target)) this.elements.modeSelector.classList.remove('open');
            }
        });

        // Typing logic
        this.elements.typingInput.addEventListener('input', (e) => this.handleTyping(e));
        this.elements.typingInput.addEventListener('paste', (e) => e.preventDefault());
        
        window.addEventListener('keydown', (e) => {
             if (document.activeElement !== this.elements.typingInput && !this.elements.resultOverlay.classList.contains('active')) {
                 if (e.key.length === 1 || e.key === 'Backspace') {
                     if (this.elements.startOverlay.style.display !== 'none') {
                        this.activateTest();
                     } else {
                        this.elements.typingInput.focus();
                     }
                 }
             }
        });
    }

    playSound(type) {
        const sound = this.sounds[type].cloneNode();
        sound.volume = this.sounds[type].volume;
        sound.play();
    }

    updateSelector(container, activeOption) {
        container.querySelectorAll('.toggle').forEach(opt => opt.classList.remove('active'));
        activeOption.classList.add('active');
    }

    updatePBDisplay() {
        this.elements.pb.textContent = this.personalBest;
    }

    prepareFirstTest() {
        this.passage = this.getRandomPassage();
        this.renderPassage();
        this.resetStats();
        this.updateStatsDisplay();
    }

    getRandomPassage() {
        const difficultyData = this.data[this.currentDifficulty];
        const randomIndex = Math.floor(Math.random() * difficultyData.length);
        return difficultyData[randomIndex].text;
    }

    renderPassage() {
        this.elements.passageDisplay.innerHTML = '';
        this.passage.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            if (index === 0) span.classList.add('current');
            this.elements.passageDisplay.appendChild(span);
        });
    }

    resetStats() {
        this.typedText = "";
        this.mistakes = 0;
        this.wpm = 0;
        this.accuracy = 100;
        this.currentTime = this.currentMode === 'timed' ? 60 : 0;
        this.wpmHistory = [];
        this.ghostCharIndex = 0;
    }

    showStartScreen() {
        this.elements.resultOverlay.classList.add('hidden');
        this.elements.startOverlay.style.display = 'flex';
        this.elements.passageDisplay.classList.add('blurred');
        this.elements.restartBtn.classList.add('hidden');
        this.prepareFirstTest();
    }

    activateTest() {
        this.elements.startOverlay.style.display = 'none';
        this.elements.resultOverlay.classList.add('hidden');
        this.elements.passageDisplay.classList.remove('blurred');
        this.elements.restartBtn.classList.remove('hidden');
        this.resetStats();
        this.updateStatsDisplay();
        this.elements.typingInput.value = '';
        this.elements.typingInput.focus();
        this.isTestRunning = false;
    }

    handleTyping(e) {
        if (!this.isTestRunning && this.elements.typingInput.value.length > 0) {
            this.startTimer();
        }

        const value = this.elements.typingInput.value;
        const lastChar = value[value.length - 1];
        const targetChar = this.passage[value.length - 1];

        if (lastChar != null) {
            if (lastChar === targetChar) {
                this.playSound('click');
            } else {
                this.playSound('error');
            }
        }

        this.updatePassageDisplay(value);
        this.calculateStats(value.length);
        this.updateStatsDisplay();

        if (this.currentMode === 'passage' && value.length >= this.passage.length) {
            this.endTest();
        }
    }

    updatePassageDisplay(value) {
        const currentChars = value.split('');
        const passageSpans = this.elements.passageDisplay.querySelectorAll('span');
        
        let localMistakes = 0;
        passageSpans.forEach((span, index) => {
            const char = currentChars[index];
            
            // Keep ghost classes if present
            const isGhost = span.classList.contains('ghost');
            const isGhostHead = span.classList.contains('ghost-head');
            
            span.className = ''; // Reset
            if (isGhost) span.classList.add('ghost');
            if (isGhostHead) span.classList.add('ghost-head');
            
            if (char == null) {
                if (index === currentChars.length) {
                    span.classList.add('current');
                }
            } else if (char === this.passage[index]) {
                span.classList.add('correct');
            } else {
                span.classList.add('incorrect');
                localMistakes++;
            }
        });
        this.mistakes = localMistakes;
    }

    calculateStats(typedLength) {
        let timeElapsed;
        if (this.currentMode === 'timed') {
            timeElapsed = 60 - this.currentTime;
        } else {
            timeElapsed = this.currentTime;
        }

        if (timeElapsed > 0) {
            this.wpm = Math.max(0, Math.round(((typedLength - this.mistakes) / 5) / (timeElapsed / 60)));
        }

        if (typedLength > 0) {
            this.accuracy = Math.max(0, Math.round(((typedLength - this.mistakes) / typedLength) * 100));
        } else {
            this.accuracy = 100;
        }
    }

    updateStatsDisplay() {
        this.elements.currentWpm.textContent = this.wpm;
        this.elements.currentAccuracy.textContent = `${this.accuracy}%`;
        const minutes = Math.floor(Math.abs(this.currentTime) / 60);
        const seconds = Math.abs(this.currentTime) % 60;
        this.elements.currentTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    startTimer() {
        this.isTestRunning = true;
        this.timerInterval = setInterval(() => {
            if (this.currentMode === 'timed') {
                this.currentTime--;
                if (this.currentTime <= 0) this.endTest();
            } else {
                this.currentTime++;
            }
            
            // Collect data for graph
            this.wpmHistory.push(this.wpm);
            
            // Ghost logic
            if (this.ghostEnabled && this.personalBest > 0) {
                this.updateGhostPosition();
            }
            
            this.updateStatsDisplay();
        }, 1000);
    }

    updateGhostPosition() {
        const charsPerSec = (this.personalBest * 5) / 60;
        let timeElapsed;
        if (this.currentMode === 'timed') {
            timeElapsed = 60 - this.currentTime;
        } else {
            timeElapsed = this.currentTime;
        }
        
        this.ghostCharIndex = Math.min(this.passage.length - 1, Math.floor(timeElapsed * charsPerSec));
        
        const passageSpans = this.elements.passageDisplay.querySelectorAll('span');
        passageSpans.forEach((span, index) => {
            span.classList.remove('ghost', 'ghost-head');
            if (index < this.ghostCharIndex) {
                span.classList.add('ghost');
            } else if (index === this.ghostCharIndex) {
                span.classList.add('ghost-head');
            }
        });
    }

    stopTimer() {
        clearInterval(this.timerInterval);
        this.isTestRunning = false;
    }

    endTest() {
        this.stopTimer();
        const typedLength = this.elements.typingInput.value.length;
        this.calculateStats(typedLength);
        
        // Final PB check and UI updates
        this.elements.finalWpm.textContent = this.wpm;
        this.elements.finalAccuracy.textContent = `${this.accuracy}%`;
        this.elements.finalCorrect.textContent = typedLength - this.mistakes;
        this.elements.finalIncorrect.textContent = this.mistakes;
        
        if (this.accuracy < 90) this.elements.finalAccuracy.style.color = 'var(--Red500)';
        else if (this.accuracy >= 95) this.elements.finalAccuracy.style.color = 'var(--Green500)';
        else this.elements.finalAccuracy.style.color = 'var(--Neutral0)';
        
        if (this.wpm > this.personalBest) {
            this.personalBest = this.wpm;
            localStorage.setItem('typing_pb', this.personalBest);
            this.updatePBDisplay();
            this.elements.pbBadge.classList.remove('hidden');
        } else {
            this.elements.pbBadge.classList.add('hidden');
        }
        
        this.drawGraph();
        this.elements.resultOverlay.classList.remove('hidden');
        this.elements.passageDisplay.classList.add('blurred');
        this.elements.restartBtn.classList.add('hidden');
    }

    drawGraph() {
        const ctx = this.elements.canvas.getContext('2d');
        const width = this.elements.canvas.width = this.elements.canvas.clientWidth;
        const height = this.elements.canvas.height = this.elements.canvas.clientHeight;
        
        ctx.clearRect(0, 0, width, height);
        
        if (this.wpmHistory.length < 2) return;
        
        const maxWpm = Math.max(...this.wpmHistory, this.personalBest, 50);
        const padding = 20;
        const plotWidth = width - (padding * 2);
        const plotHeight = height - (padding * 2);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (plotHeight * (i / 5));
            ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
        }

        // Draw Line
        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        
        this.wpmHistory.forEach((wpm, i) => {
            const x = padding + (i / (this.wpmHistory.length - 1)) * plotWidth;
            const y = height - padding - (wpm / maxWpm) * plotHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Area under line
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // PB Line
        if (this.personalBest > 0) {
            const pbY = height - padding - (this.personalBest / maxWpm) * plotHeight;
            ctx.strokeStyle = 'rgba(255, 193, 7, 0.3)';
            ctx.setLineDash([5, 5]);
            ctx.beginPath(); ctx.moveTo(padding, pbY); ctx.lineTo(width - padding, pbY); ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TypingTest();
});
