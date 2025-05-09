import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ChatMessage, ChatPhoto } from './AdminChatService';

interface MessageListener {
    (message: any): void;
}

class AdminWebSocketService {
    private client: Client | null = null;
    private messageListeners: Map<string, MessageListener[]> = new Map();
    private salonId: string | null = null;

    // 웹소켓 연결 초기화
    initialize(salonId: string) {
        this.salonId = salonId;

        // 이미 연결되어 있으면 기존 연결 해제
        if (this.client && this.client.connected) {
            this.disconnect();
        }

        // 새로운 STOMP 클라이언트 생성
        this.client = new Client({
            brokerURL: undefined, // 브라우저에서 자동으로 WebSocket URL 결정
            webSocketFactory: () => new SockJS('/ws'),
            debug: function (str) {
                console.log('STOMP: ' + str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        // 연결 성공 핸들러
        this.client.onConnect = (frame) => {
            console.log('WebSocket Connected: ' + frame);
            // 미용실별 메시지 큐 구독
            this.client?.subscribe(`/user/${this.salonId}/queue/messages`, (message) => {
                console.log('WebSocket message received:', message.body);
                const messageData = JSON.parse(message.body);
                this.notifyListeners('message', messageData);
            });
        };

        // 에러 핸들러
        this.client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };

        // 연결 시작
        this.client.activate();
    }

    // 웹소켓 연결 종료
    disconnect() {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
        }
    }

    // 메시지 전송 (텍스트만)
    sendMessage(chatRoomId: number, content: string, senderType: string) {
        this.sendMessageWithPhotos(chatRoomId, content, senderType, []);
    }

    // 메시지 전송 (사진 포함)
    sendMessageWithPhotos(
        chatRoomId: number,
        message: string,
        senderType: string,
        photos: ChatPhoto[] = []
    ) {
        if (!this.client || !this.client.connected) {
            console.error('WebSocket is not connected');
            return;
        }

        const messagePayload = {
            chatRoomId,
            message,
            senderType,
            senderId: this.salonId,
            photos
        };

        this.client.publish({
            destination: '/app/chat.sendMessage',
            body: JSON.stringify(messagePayload)
        });
    }

    // 이벤트 리스너 등록
    addListener(event: string, callback: MessageListener) {
        if (!this.messageListeners.has(event)) {
            this.messageListeners.set(event, []);
        }
        this.messageListeners.get(event)?.push(callback);
    }

    // 이벤트 리스너 제거
    removeListener(event: string, callback: MessageListener) {
        const listeners = this.messageListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // 리스너들에게 이벤트 알림
    private notifyListeners(event: string, data: any) {
        const listeners = this.messageListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => listener(data));
        }
    }
}

// 싱글톤으로 내보내기
export default new AdminWebSocketService();