import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Typography,
    IconButton,
    Avatar,
    TextField,
    Paper,
    InputAdornment,
    CircularProgress,
    Button
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import styles from './ChatRoom.module.css';
import ChatService, { ChatMessage, ChatPhoto } from '../../services/chat/ChatService';
import WebSocketService from '../../services/chat/WebSocketService';
import TranslationService from '../../services/chat/TranslationService';
import FileUploadService from '../../services/chat/FileUploadService';

interface ChatRoomInfo {
    id: number;
    salonId: string;
    salonName: string;
    userLanguage: string;
    salonLanguage: string;
}

// 번역 상태를 관리하기 위한 인터페이스
interface TranslationState {
    isLoading: boolean;
    text: string | null;
    error: string | null;
}

const ChatRoom: React.FC = () => {
    const { roomId, salonId } = useParams<{ roomId: string; salonId: string }>();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState<string>('');
    const [chatRoom, setChatRoom] = useState<ChatRoomInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    // 번역 상태를 관리하는 상태 변수 (messageId를 키로 사용)
    const [translations, setTranslations] = useState<Record<number, TranslationState>>({});
    // 사진 업로드 관련 상태 추가
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const [userId] = useState<string>('user1'); // 테스트용 사용자 ID (실제로는 인증 서비스에서 가져와야 함)

    // 웹소켓 연결 및 메시지 수신 설정
    useEffect(() => {
        // 웹소켓 초기화
        WebSocketService.initialize(userId);

        // 메시지 수신 리스너 등록
        const handleNewMessage = (messageData: ChatMessage) => {
            if (messageData.chatRoomId === Number(roomId)) {
                setMessages(prev => {
                    // 이미 같은 메시지가 있는지 확인 (임시 ID로 추가한 메시지)
                    const messageExists = prev.some(msg =>
                        msg.message === messageData.message &&
                        msg.senderType === messageData.senderType &&
                        msg.translationStatus === messageData.translationStatus &&
                        msg.translatedMessage === messageData.translatedMessage &&
                        Math.abs(new Date(msg.sentAt).getTime() - new Date(messageData.sentAt).getTime()) < 5000
                    );

                    if (messageExists) {
                        // 기존 메시지를 새 메시지로 업데이트
                        return prev.map(msg =>
                            msg.message === messageData.message &&
                            msg.senderType === messageData.senderType &&
                            msg.translationStatus === messageData.translationStatus &&
                            msg.translatedMessage === messageData.translatedMessage &&
                            Math.abs(new Date(msg.sentAt).getTime() - new Date(messageData.sentAt).getTime()) < 5000
                                ? messageData : msg
                        );
                    } else {
                        // 새 메시지 추가
                        return [...prev, messageData];
                    }
                });
            }
        };

        WebSocketService.addListener('message', handleNewMessage);

        // 컴포넌트 언마운트 시 리스너 제거 및 연결 해제
        return () => {
            WebSocketService.removeListener('message', handleNewMessage);
        };
    }, [userId, roomId]);

    // 채팅방 정보와 메시지 로드
    useEffect(() => {
        const fetchChatRoom = async () => {
            try {
                if (!roomId) return;

                // 채팅방 정보를 서버에서 가져오는 API가 없어서 간단한 정보로 대체
                setChatRoom({
                    id: Number(roomId),
                    salonId: salonId || '',
                    salonName: 'Beauty Salon', // 실제로는 API에서 받아와야 함
                    userLanguage: 'en', // 사용자 언어
                    salonLanguage: 'ko', // 미용실 언어
                });

                // 채팅 메시지 로드
                const chatMessages = await ChatService.getChatMessages(Number(roomId));
                setMessages(chatMessages);

                // 메시지 읽음 처리
                await ChatService.markMessagesAsRead(Number(roomId), 'USER');

                setLoading(false);
            } catch (err) {
                console.error('채팅방 정보를 불러오는데 실패했습니다:', err);
                setLoading(false);
            }
        };

        fetchChatRoom();
    }, [roomId, salonId]);

    // 메시지 스크롤 처리
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleBackClick = () => {
        navigate('/chat');
    };

    // 파일 선택 핸들러
    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    // 파일 변경 핸들러
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newFiles: File[] = [];
        const newPreviewUrls: string[] = [];

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                newFiles.push(file);
                newPreviewUrls.push(URL.createObjectURL(file));
            }
        });

        setSelectedFiles(prev => [...prev, ...newFiles]);
        setPreviewUrls(prev => [...prev, ...newPreviewUrls]);

        // 파일 선택 후 input 값 초기화 (같은 파일 다시 선택 가능하도록)
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // 선택한 파일 제거 핸들러
    const removeSelectedFile = (index: number) => {
        URL.revokeObjectURL(previewUrls[index]); // 메모리 누수 방지
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    // 번역 요청 및 토글 함수
    const handleTranslateRequest = async (message: ChatMessage) => {
        const messageId = message.id;

        // 이미 번역이 로드되었으면 토글 수행
        if (translations[messageId] && !translations[messageId].isLoading) {
            // 이미 번역이 표시되어 있으면 제거
            if (!translations[messageId].error && translations[messageId].text) {
                setTranslations(prev => {
                    const newTranslations = { ...prev };
                    delete newTranslations[messageId];
                    return newTranslations;
                });
                return;
            }

            // 에러가 있으면 다시 시도
            if (translations[messageId].error) {
                // 로딩 상태로 설정
                setTranslations(prev => ({
                    ...prev,
                    [messageId]: { isLoading: true, text: null, error: null }
                }));

                try {
                    await requestTranslation(message);
                } catch (error) {
                    console.error('번역 요청 실패:', error);
                }
            }
            return;
        }

        // 로딩 상태로 설정
        setTranslations(prev => ({
            ...prev,
            [messageId]: { isLoading: true, text: null, error: null }
        }));

        try {
            await requestTranslation(message);
        } catch (error) {
            console.error('번역 요청 실패:', error);
            setTranslations(prev => ({
                ...prev,
                [messageId]: { isLoading: false, text: null, error: '번역 요청에 실패했습니다.' }
            }));
        }
    };

    // 실제 번역 요청을 수행하는 함수
    const requestTranslation = async (message: ChatMessage) => {
        if (!chatRoom) return;

        const messageId = message.id;
        const sourceLang = message.senderType === 'USER' ? chatRoom.userLanguage : chatRoom.salonLanguage;
        const targetLang = message.senderType === 'USER' ? chatRoom.salonLanguage : chatRoom.userLanguage;

        try {
            const translatedText = await TranslationService.translate(
                message.message,
                sourceLang,
                targetLang
            );

            setTranslations(prev => ({
                ...prev,
                [messageId]: { isLoading: false, text: translatedText, error: null }
            }));
        } catch (error) {
            console.error('번역 요청 실패:', error);
            setTranslations(prev => ({
                ...prev,
                [messageId]: { isLoading: false, text: null, error: '번역 요청에 실패했습니다.' }
            }));
        }
    };

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && selectedFiles.length === 0) || !chatRoom) return;

        setLoading(true); // 메시지 전송 중 로딩 상태 설정

        try {
            // 사진이 있는 경우 먼저 업로드
            let photoAttachments: ChatPhoto[] = [];

            if (selectedFiles.length > 0) {
                // 여러 이미지를 한 번에 업로드
                const uploadResults = await FileUploadService.uploadMultipleImages(selectedFiles);

                // 업로드 결과를 ChatPhoto 형식으로 변환
                photoAttachments = uploadResults.map(result => ({
                    photoId: Date.now(), // 임시 ID, 서버에서 실제 ID가 할당됨
                    photoUrl: result.fileUrl
                }));
            }

            // 임시 메시지 객체 생성 (UI에 즉시 표시용)
            const tempMessage: ChatMessage = {
                id: Date.now(), // 임시 ID
                chatRoomId: chatRoom.id,
                senderType: 'USER',
                senderId: userId,
                message: newMessage || selectedFiles.length > 0 ? '사진을 보냈습니다.' : '',
                isRead: false,
                sentAt: new Date().toISOString(),
                translatedMessage: null,
                translationStatus: 'pending',
                photos: photoAttachments
            };

            // 메시지를 즉시 UI에 추가
            setMessages(prev => [...prev, tempMessage]);

            // 웹소켓으로 메시지 전송 (사진 포함)
            WebSocketService.sendMessageWithPhotos(
                chatRoom.id,
                newMessage,
                'USER',
                photoAttachments
            );

            // 입력 필드 및 선택된 파일 초기화
            setNewMessage('');
            setSelectedFiles([]);
            previewUrls.forEach(url => URL.revokeObjectURL(url));
            setPreviewUrls([]);

        } catch (error) {
            console.error('메시지 전송 실패:', error);
            alert('메시지 전송에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <CircularProgress size={40} />
                <Typography sx={{ ml: 2 }}>채팅방을 불러오는 중...</Typography>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <IconButton onClick={handleBackClick} size="small">
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6">{chatRoom?.salonName || '채팅방'}</Typography>
            </div>

            <div className={styles.messagesContainer}>
                {messages.map((message) => {
                    const isUserMessage = message.senderType === 'USER';
                    const messageClassName = `${styles.messageBubble} ${isUserMessage ? styles.userMessage : styles.salonMessage}`;
                    const translationState = translations[message.id];

                    return (
                        <div key={message.id} className={messageClassName}>
                            {!isUserMessage && (
                                <Avatar className={styles.messageAvatar} alt={chatRoom?.salonName} />
                            )}

                            <Paper elevation={0} className={styles.messageContent}>
                                <Typography className={styles.originalMessage}>
                                    {message.message}
                                </Typography>

                                {/* 이미지가 있으면 표시 */}
                                {message.photos && message.photos.length > 0 && (
                                    <div className={styles.imageContainer}>
                                        {message.photos.map((photo, index) => (
                                            <img
                                                key={index}
                                                src={photo.photoUrl}
                                                alt={`Photo ${index}`}
                                                className={`${styles.messageImage} ${message.photos.length === 1 ? styles.singleImage : styles.multipleImages}`}
                                                onClick={() => window.open(photo.photoUrl, '_blank')}
                                            />
                                        ))}
                                    </div>
                                )}

                                <Button
                                    size="small"
                                    onClick={() => handleTranslateRequest(message)}
                                    className={styles.translateButton}
                                    disabled={translationState?.isLoading}
                                >
                                    {!translationState ? '번역 보기' :
                                        translationState.isLoading ? '번역 중...' :
                                            translationState.error ? '다시 시도' : '번역 숨기기'}
                                </Button>

                                {translationState && !translationState.isLoading && !translationState.error && (
                                    <Typography className={styles.translatedMessage}>
                                        {translationState.text}
                                    </Typography>
                                )}

                                {translationState?.error && (
                                    <Typography className={styles.translationError}>
                                        {translationState.error}
                                    </Typography>
                                )}

                                <Typography className={styles.messageTimestamp}>
                                    {new Date(message.sentAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Typography>
                            </Paper>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputContainer}>
                {/* 선택된 이미지 미리보기를 입력 필드 위에 표시 */}
                {previewUrls.length > 0 && (
                    <div className={styles.previewContainer}>
                        {previewUrls.map((url, index) => (
                            <div key={index} className={styles.previewItem}>
                                <img
                                    src={url}
                                    alt={`Preview ${index}`}
                                    className={styles.previewImage}
                                />
                                <IconButton
                                    size="small"
                                    className={styles.removeButton}
                                    onClick={() => removeSelectedFile(index)}
                                >
                                    ✕
                                </IconButton>
                            </div>
                        ))}
                    </div>
                )}

                {/* 파일 선택을 위한 숨겨진 input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                />

                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="메시지를 입력하세요..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                {/* 사진 업로드 버튼 */}
                                <IconButton size="small" onClick={handleFileSelect}>
                                    <ImageIcon />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() && selectedFiles.length === 0}
                                    color="primary"
                                >
                                    <SendIcon />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '24px',
                            backgroundColor: '#fff'
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default ChatRoom;