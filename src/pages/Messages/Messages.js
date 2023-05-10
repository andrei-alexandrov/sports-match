import React, { useState, useEffect, useRef } from "react";
import userManager from "../../services/UserManager";
import { Message, messagesManager } from "../../services/MessagesManager";
import { useNavigate } from "react-router-dom";
import "./Messages.scss";
import { useLocation } from "react-router-dom";
import "../../sweetalert2-custom.scss";
import LoginModal from "../../components/Modals/LoginModal";
import userImage from "../../images/user.png";
import ReactEmoji from 'react-emoji';

const Messages = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [currentReceiver, setCurrentReceiver] = useState(location.state?.receiver || props.location?.state?.receiver || "");
  const messageListRef = useRef(null);
  const loggedInUser = userManager.getLoggedInUser();
  const [updatedImages, setUpdatedImages] = useState({});

  useEffect(() => {
    const checkLoggedInUser = async () => {
      if (!loggedInUser) {
        const isLoggedIn = await LoginModal();
        if (!isLoggedIn) {
          navigate('/home');
          return;
        } else {
          navigate('/login', { state: { from: '/profile' } });
          return;
        }
      }
    }
    checkLoggedInUser();
  }, []);


  useEffect(() => {
    const fetchMessages = () => {
      const loadedMessages = messagesManager.loadMessagesFromStorage();
      if (JSON.stringify(loadedMessages) !== JSON.stringify(messages)) {
        setMessages(loadedMessages);
      }
    };
  
    setMessages(messagesManager.loadMessagesFromStorage());
    const intervalId = setInterval(() => {
      fetchMessages();
    }, 2000);
  
    return () => {
      clearInterval(intervalId);
    };
  }, []);


  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);


  useEffect(() => {
    const updateImages = async () => {
      const updatedUsers = await userManager.fetchAllUsers();
      userManager.users = updatedUsers;
      const currentReceiverObj = updatedUsers.find((user) => user.username === currentReceiver);
      if (currentReceiverObj && currentReceiverObj.getImage()) {
        setUpdatedImages((prevImages) => ({ ...prevImages, [currentReceiver]: currentReceiverObj.getImage() }));
      }
    };
    const intervalId = setInterval(() => {
      updateImages();
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentReceiver]);


  const handleSendMessage = (event) => {
    event.preventDefault();
    const messageText = event.target.message.value;
    const message = new Message(messageText, new Date(), loggedInUser.username, currentReceiver);

    messagesManager.addMessage(message);
    event.target.reset();
    setMessages(messagesManager.loadMessagesFromStorage());
  };

  const hasUnreadMessages = (receiver) => {
    return messages.some(
      (message) =>
        message.status === "unread" &&
        message.receiver === loggedInUser?.username &&
        message.sender === receiver
    );
  };


  const handleConversationClick = (receiver) => {
    setCurrentReceiver(receiver);
    const updatedMessages = messages.map((message) => {
      if (
        message.sender === receiver &&
        message.receiver === loggedInUser?.username &&
        message.status === "unread"
      ) {
        return { ...message, status: "read" };
      }
      return message;
    });
    messagesManager.updateMessagesInStorage(updatedMessages);
    setMessages(updatedMessages);
  };


  const formatDate = (date) => {
    const currentDate = new Date();
    const messageDate = new Date(date);

    let dateString = '';
    if (currentDate.getDate() !== messageDate.getDate() ||
      currentDate.getMonth() !== messageDate.getMonth() ||
      currentDate.getFullYear() !== messageDate.getFullYear()) {
      const dateOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      dateString = messageDate.toLocaleString('en-US', dateOptions) + ', ';
    }

    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const timeString = messageDate.toLocaleString('bg-BG', timeOptions);

    return dateString + timeString;
  }

  const getSenderImage = (sender) => {
    const senderObj = userManager.users.find((user) => user.username === sender);
    return updatedImages[sender] || (senderObj ? senderObj.getImage() : userImage);
  };

  const getReceiverImage = (receiver) => {
    const receiverObj = userManager.users.find((user) => user.username === receiver);
    return updatedImages[receiver] || (receiverObj && receiverObj.getImage() ? receiverObj.getImage() : userImage);
  };

  return (
    <div className="chatPage">
      <div className="conversationList">
        <h1>Chats</h1>
        <ul>
          {messagesManager.getConversations(loggedInUser?.username).map((receiver, index) => (
            <li key={index} onClick={() => handleConversationClick(receiver)}>
              <img
                src={getReceiverImage(receiver, updatedImages)}
                alt={receiver}
                className="receiverImage"
              />
              {receiver}
              {hasUnreadMessages(receiver) && (
                <span className="unreadIndicator"></span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="chatContainer">
        {loggedInUser && (
          <div className="receiverHeader">
            <h1>{currentReceiver ? currentReceiver : "Go back and find a buddy"}</h1>
            {currentReceiver && (
              <img
                src={getReceiverImage(currentReceiver, updatedImages)}
                alt={currentReceiver}
                className="receiverImage"
              />
            )}
          </div>
        )}
        <div className="messagesWrapper">
          <ul className="messagesList" ref={messageListRef}>
            {messages
              .filter(
                (message) =>
                  (message.sender === loggedInUser?.username && message.receiver === currentReceiver) ||
                  (message.sender === currentReceiver && message.receiver === loggedInUser?.username)
              )
              .map((message, index) => (
                <MessageComponent key={index} message={message} loggedInUser={loggedInUser} formatDate={formatDate} getSenderImage={getSenderImage} getReceiverImage={getReceiverImage} setUpdatedImage={setUpdatedImages} />
              ))}
          </ul>
          <form className="messagesForm" onSubmit={handleSendMessage}>
            <input type="text" name="message" placeholder="Type a message..." autoComplete="off" disabled={!currentReceiver} />
            <button type="submit" disabled={!currentReceiver}>Send</button>
          </form>
        </div>
      </div>
    </div>
  );
};


const MessageComponent = ({ message, loggedInUser, formatDate, getReceiverImage, getSenderImage }) => {
  const isSentByLoggedInUser = message.sender === loggedInUser?.username;
  const sender = userManager.users.find((user) => user.username === message.sender);
  const timestamp = formatDate(message.timestamp);
  const senderImage = getSenderImage(message.sender);

  const emojifiedText = ReactEmoji.emojify(message.text).map((item, index) => (
    <span key={index} className={typeof item === 'string' ? '' : 'emoji'}>
      {item}
    </span>
  ));

  return (
    <>
      <span className="shortTimestamp">{timestamp}</span>
      <li className={`message ${isSentByLoggedInUser ? "sender" : "receiver"}`}>
        {!isSentByLoggedInUser && (
          <div className="senderInfo">
            <img
              src={senderImage ? senderImage : userImage}
              alt={message.sender}
              className="senderImage"
            />
          </div>
        )}
        <span className="messageText">{emojifiedText}</span>
      </li>
    </>
  );
}
export default Messages;
