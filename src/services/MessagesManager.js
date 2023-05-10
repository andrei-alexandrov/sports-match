class Message {
  constructor(text, timestamp, sender, receiver, status = 'unread') {
    this.text = text;
    this.timestamp = timestamp;
    this.sender = sender;
    this.receiver = receiver;
    this.status = status;
  }
}

const CHAT_STORAGE_KEY = 'chatState';

class MessagesManager {
  constructor() {
    this.messages = [];
    this.intervalId = null;
    this.startCheckingStorage();
  }

  loadMessagesFromStorage() {
    const storedMessages = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || [];
    if (Array.isArray(storedMessages)) {
      this.messages = storedMessages.map(message => new Message(message.text, new Date(message.timestamp), message.sender, message.receiver));
    } else {
      this.messages = [];
    }
    return this.messages;
  }

  addMessage(message) {
    this.messages.push(message);
    this.saveMessagesToStorage();
  }

  saveMessagesToStorage() {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(this.messages));
  }

  checkStorage() {
    const storedMessages = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY));
    if (storedMessages && Array.isArray(storedMessages)) {
      const newMessages = storedMessages.filter(message => !this.messages.some(m => new Date(m.timestamp).toString() === new Date(message.timestamp).toString()));
      if (newMessages.length > 0) {
        this.messages.push(...newMessages.map(m => new Message(m.text, new Date(m.timestamp), m.sender, m.receiver)));
      }
    }
  }

  getConversations(username) {
    const conversationSet = new Set();
    this.messages.forEach(message => {
      if (message.sender === username) {
        conversationSet.add(message.receiver);
      } else if (message.receiver === username) {
        conversationSet.add(message.sender);
      }
    });
    return Array.from(conversationSet);
  }

  startCheckingStorage() {
    this.intervalId = setInterval(() => this.checkStorage(), 5000);
  }
  
  updateMessagesInStorage(updatedMessages) {
    this.messages = updatedMessages;
    this.saveMessagesToStorage();
  };
}

const messagesManager = new MessagesManager();
export { Message, messagesManager };