class TypingTest {
    constructor() {
        this.data = null;
        this.currentDifficulty = 'easy';
        this.currentMode = 'timed'; // 'timed' or 'passage'
        this.timerSeconds = 60;
        this.currentTime = 0;
        this.timerInterval = null;
        this.isTestRunning = false;
        
        this.passage = "";
        this.typedText = "";
        this.mistakes = 0;
        this.accuracy = 100;
        this.wpm = 0;
        
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
            
            startOverlay: document.getElementById('start-overlay'),
            startBtn: document.getElementById('start-btn'),
            
            resultOverlay: document.getElementById('result-overlay'),
            finalWpm: document.getElementById('final-wpm'),
            finalAccuracy: document.getElementById('final-accuracy'),
            finalCorrect: document.getElementById('final-correct'),
            finalIncorrect: document.getElementById('final-incorrect'),
            pbBadge: document.getElementById('new-pb-badge'),
            goAgainBtn: document.getElementById('go-again-btn'),
            
            restartBtn: document.getElementById('restart-btn-test')
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

        // Start Test (Button)
        this.elements.startBtn.addEventListener('click', () => this.activateTest());

        // Start Test (Typing Area Click)
        this.elements.passageDisplay.addEventListener('click', () => {
            if (this.elements.startOverlay.style.display !== 'none') {
                this.activateTest();
            } else {
                this.elements.typingInput.focus();
            }
        });

        // Go Again
        this.elements.goAgainBtn.addEventListener('click', () => this.showStartScreen());

        // Restart Test
        this.elements.restartBtn.addEventListener('click', () => this.activateTest());

        // Typing logic
        this.elements.typingInput.addEventListener('input', (e) => this.handleTyping(e));
        
        // Prevent paste
        this.elements.typingInput.addEventListener('paste', (e) => e.preventDefault());
        
        // Focus handler to keep caret visible
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
        this.isTestRunning = false; // Timer starts on first input
    }

    handleTyping(e) {
        if (!this.isTestRunning && this.elements.typingInput.value.length > 0) {
            this.startTimer();
        }

        const value = this.elements.typingInput.value;
        const currentChars = value.split('');
        const passageSpans = this.elements.passageDisplay.querySelectorAll('span');
        
        let localMistakes = 0;
        
        passageSpans.forEach((span, index) => {
            const char = currentChars[index];
            
            span.classList.remove('current', 'correct', 'incorrect');
            
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
        this.calculateStats(value.length);
        this.updateStatsDisplay();

        // Check completion (Passage Mode)
        if (this.currentMode === 'passage' && value.length >= this.passage.length) {
            this.endTest();
        }
    }

    calculateStats(typedLength) {
        let timeElapsed;
        if (this.currentMode === 'timed') {
            timeElapsed = 60 - this.currentTime;
        } else {
            timeElapsed = this.currentTime;
        }

        if (timeElapsed > 0) {
            const netWPM = Math.max(0, Math.round(((typedLength - this.mistakes) / 5) / (timeElapsed / 60)));
            this.wpm = netWPM;
        } else {
            this.wpm = 0;
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
        
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.elements.currentTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    startTimer() {
        this.isTestRunning = true;
        this.timerInterval = setInterval(() => {
            if (this.currentMode === 'timed') {
                this.currentTime--;
                if (this.currentTime <= 0) {
                    this.endTest();
                }
            } else {
                this.currentTime++;
            }
            this.updateStatsDisplay();
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
        this.isTestRunning = false;
    }

    endTest() {
        this.stopTimer();
        
        const typedLength = this.elements.typingInput.value.length;
        this.calculateStats(typedLength);
        
        // Update results display
        this.elements.finalWpm.textContent = this.wpm;
        this.elements.finalAccuracy.textContent = `${this.accuracy}%`;
        
        // Color coding for accuracy
        if (this.accuracy < 90) {
            this.elements.finalAccuracy.style.color = 'var(--Red500)';
        } else if (this.accuracy >= 95) {
            this.elements.finalAccuracy.style.color = 'var(--Green500)';
        } else {
            this.elements.finalAccuracy.style.color = 'var(--Neutral0)';
        }
        
        this.elements.finalCorrect.textContent = typedLength - this.mistakes;
        this.elements.finalIncorrect.textContent = this.mistakes;
        
        // Check PB
        if (this.wpm > this.personalBest) {
            this.personalBest = this.wpm;
            localStorage.setItem('typing_pb', this.personalBest);
            this.updatePBDisplay();
            this.elements.pbBadge.classList.remove('hidden');
        } else {
            this.elements.pbBadge.classList.add('hidden');
        }
        
        this.elements.resultOverlay.classList.remove('hidden');
        this.elements.passageDisplay.classList.add('blurred');
        this.elements.restartBtn.classList.add('hidden');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new TypingTest();
});
