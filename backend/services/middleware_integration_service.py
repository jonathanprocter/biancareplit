import logging
from typing import Dict, Any, Optional
from datetime import datetime
from ..utils.websocket import WebSocketManager
from ..utils.events import EventEmitter
from .analytics_service import AnalyticsService

class MiddlewareIntegrationService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.ws_manager = WebSocketManager()
        self.event_emitter = EventEmitter()
        self.analytics_service = AnalyticsService()
        self.active_sessions = {}

    async def initialize_session(self, user_id: str, session_id: str) -> Dict:
        """Initialize middleware integration for a new session"""
        try:
            # Initialize WebSocket connection
            ws_connection = await self.ws_manager.initialize_session(
                user_id=user_id,
                session_id=session_id
            )

            # Initialize analytics tracking
            analytics_session = await self.analytics_service.initialize_session(
                user_id=user_id,
                session_id=session_id
            )

            self.active_sessions[session_id] = {
                'user_id': user_id,
                'ws_connection': ws_connection,
                'analytics_session': analytics_session,
                'start_time': datetime.now().isoformat()
            }

            return {
                'session_id': session_id,
                'status': 'initialized',
                'ws_connection': ws_connection['connection_id']
            }

        except Exception as e:
            self.logger.error(f"Middleware integration initialization error: {str(e)}")
            raise

    async def process_event(
        self,
        session_id: str,
        event_type: str,
        event_data: Dict[str, Any]
    ) -> Dict:
        """Process events through middleware integration"""
        try:
            if session_id not in self.active_sessions:
                raise ValueError(f"Invalid session ID: {session_id}")

            # Process analytics event
            analytics_result = await self.analytics_service.process_event(
                session_id=session_id,
                event_type=event_type,
                event_data=event_data
            )

            # Emit event through event emitter
            await self.event_emitter.emit(event_type, {
                'session_id': session_id,
                'data': event_data,
                'analytics': analytics_result
            })

            # Send real-time update through WebSocket
            await self.ws_manager.send_update(
                session_id=session_id,
                update_type=event_type,
                data={
                    'event_data': event_data,
                    'analytics': analytics_result
                }
            )

            return {
                'status': 'processed',
                'analytics': analytics_result,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            self.logger.error(f"Event processing error: {str(e)}")
            raise

    async def update_session_state(
        self,
        session_id: str,
        state_update: Dict[str, Any]
    ) -> Dict:
        """Update session state and notify connected clients"""
        try:
            if session_id not in self.active_sessions:
                raise ValueError(f"Invalid session ID: {session_id}")

            session = self.active_sessions[session_id]
            
            # Update analytics
            analytics_update = await self.analytics_service.update_session_state(
                session_id=session_id,
                state_data=state_update
            )

            # Send state update through WebSocket
            await self.ws_manager.send_update(
                session_id=session_id,
                update_type='state_update',
                data={
                    'state': state_update,
                    'analytics': analytics_update
                }
            )

            return {
                'status': 'updated',
                'session_id': session_id,
                'analytics': analytics_update,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            self.logger.error(f"Session state update error: {str(e)}")
            raise

    async def close_session(self, session_id: str) -> Dict:
        """Close and cleanup middleware integration session"""
        try:
            if session_id not in self.active_sessions:
                return {'status': 'not_found'}

            session = self.active_sessions[session_id]

            # Close WebSocket connection
            await self.ws_manager.close_connection(
                session['ws_connection']['connection_id']
            )

            # Finalize analytics
            final_analytics = await self.analytics_service.finalize_session(
                session_id=session_id
            )

            # Remove session
            del self.active_sessions[session_id]

            return {
                'status': 'closed',
                'session_id': session_id,
                'final_analytics': final_analytics,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            self.logger.error(f"Session closure error: {str(e)}")
            raise

    def get_active_sessions(self, user_id: Optional[str] = None) -> Dict:
        """Get information about active sessions"""
        try:
            if user_id:
                return {
                    session_id: session
                    for session_id, session in self.active_sessions.items()
                    if session['user_id'] == user_id
                }
            return dict(self.active_sessions)

        except Exception as e:
            self.logger.error(f"Active sessions retrieval error: {str(e)}")
            return {}
