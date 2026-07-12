export function speakText(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  // Clean markdown syntax from text to make speech natural
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`([^`]+)`/g, '$1')   // remove inline code ticks
    .replace(/\[\d+\]/g, '')       // remove citation tags like [1]
    .replace(/[*_#\-]/g, '')       // remove markdown punctuation
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g, '$1') // remove link/image syntax, keep text label
    .trim();

  if (!cleanText) {
    if (onEnd) onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
