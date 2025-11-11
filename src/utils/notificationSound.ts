// Utility for playing notification sounds using Web Audio API
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

export const playNotificationSound = () => {
  try {
    const context = getAudioContext();
    
    // Create oscillators for a pleasant notification sound
    const oscillator1 = context.createOscillator();
    const oscillator2 = context.createOscillator();
    const gainNode = context.createGain();
    
    // Connect nodes
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Set frequencies for a pleasant two-tone notification
    oscillator1.frequency.setValueAtTime(800, context.currentTime);
    oscillator2.frequency.setValueAtTime(1000, context.currentTime);
    
    // Set volume envelope
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);
    
    // Play the sound
    oscillator1.start(context.currentTime);
    oscillator2.start(context.currentTime);
    oscillator1.stop(context.currentTime + 0.4);
    oscillator2.stop(context.currentTime + 0.4);
    
    console.log('Notification sound played');
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

// Request permission for notifications (useful for browsers that require interaction)
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};
