"""Health check endpoint."""
import psutil
import logging
import time
from datetime import datetime
from sqlalchemy import text
from typing import Dict, Any, Tuple
from flask import Blueprint, jsonify, request, Response, current_app
from flask_cors import cross_origin
from backend.monitoring.metrics_manager import metrics_manager
from backend.middleware.config import middleware_registry

logger = logging.getLogger(__name__)

# Create blueprint
health_bp = Blueprint('health', __name__, url_prefix='/health')

class HealthCheck:
    """Manages system health checks"""
    
    def __init__(self):
        self._last_check = None
        self._cache_duration = 30  # seconds
        self._cached_health = {
            'status': 'unknown',
            'timestamp': datetime.utcnow().isoformat(),
            'components': {}
        }

    def get_system_health(self):
        """Get system health metrics"""
        now = datetime.utcnow()
        
        # Return cached result if within cache duration
        if (self._last_check and 
            (now - self._last_check).total_seconds() < self._cache_duration):
            return self._cached_health
            
        try:
            # System metrics
            cpu = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Check components
            db_status = self._check_database()
            system_status = self._check_system_resources(cpu, memory, disk)
            middleware_status = self._check_middleware()
            
            # Build response
            health_status = {
                'status': 'healthy',
                'timestamp': now.isoformat(),
                'components': {
                    'system': system_status,
                    'database': db_status,
                    'middleware': middleware_status
                }
            }
            
            # Update status if any component is unhealthy
            if any(component['status'] != 'healthy' 
                   for component in health_status['components'].values()):
                health_status['status'] = 'degraded'
                
            # Update cache
            self._cached_health = health_status
            self._last_check = now
            
            # Update Prometheus metrics
            self._update_metrics(health_status)
            
            return health_status
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            error_status = {
                'status': 'unhealthy',
                'timestamp': now.isoformat(),
                'error': str(e)
            }
            self._cached_health = error_status
            self._last_check = now
            return error_status

    def _check_database(self):
        """Check database connection"""
        try:
            if not hasattr(current_app, 'db'):
                return {
                    'status': 'degraded',
                    'message': 'Database not configured'
                }
                
            with current_app.db.engine.connect() as conn:
                conn.execute(text('SELECT 1'))
            return {
                'status': 'healthy',
                'message': 'Database connection successful'
            }
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'message': str(e)
            }

    def _check_system_resources(self, cpu, memory, disk):
        """Check system resource usage"""
        try:
            status = 'healthy'
            warnings = []
            
            if cpu > 90:
                status = 'degraded'
                warnings.append('High CPU usage')
                
            if memory.percent > 90:
                status = 'degraded'
                warnings.append('High memory usage')
                
            if disk.percent > 90:
                status = 'degraded'
                warnings.append('Low disk space')
                
            return {
                'status': status,
                'message': '; '.join(warnings) if warnings else 'System resources OK',
                'metrics': {
                    'cpu_usage': cpu,
                    'memory_usage': memory.percent,
                    'disk_usage': disk.percent
                }
            }
        except Exception as e:
            logger.error(f"System resource check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'message': str(e)
            }

    def _check_middleware(self):
        """Check middleware status"""
        try:
            middleware_components = {}
            
            # Get all registered middleware
            for name, middleware in middleware_registry._middleware.items():
                try:
                    # Check if middleware has health check method
                    if hasattr(middleware, 'get_health'):
                        health_status = middleware.get_health()
                        middleware_components[name] = health_status
                    else:
                        # Basic status check
                        is_initialized = bool(getattr(middleware, '_initialized', False))
                        middleware_components[name] = {
                            'status': 'healthy' if is_initialized else 'degraded',
                            'message': 'Initialized' if is_initialized else 'Not fully initialized'
                        }
                except Exception as e:
                    logger.error(f"Error checking middleware {name}: {str(e)}")
                    middleware_components[name] = {
                        'status': 'unhealthy',
                        'message': str(e)
                    }
            
            # Determine overall middleware status
            if not middleware_components:
                return {
                    'status': 'degraded',
                    'message': 'No middleware components registered',
                    'components': {}
                }
            
            all_healthy = all(
                component.get('status') == 'healthy' 
                for component in middleware_components.values()
            )
            
            return {
                'status': 'healthy' if all_healthy else 'degraded',
                'message': 'All middleware healthy' if all_healthy else 'Some middleware components degraded',
                'components': middleware_components
            }
            
        except Exception as e:
            logger.error(f"Middleware status check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'message': str(e)
            }

    def _update_metrics(self, health_status):
        """Update Prometheus metrics"""
        try:
            # Update overall health
            metrics_manager.system_health.set(1 if health_status['status'] == 'healthy' else 0)
            
            # Update component health
            for component, status in health_status['components'].items():
                metrics_manager.component_health.labels(component).set(
                    1 if status['status'] == 'healthy' else 0
                )
        except Exception as e:
            logger.error(f"Failed to update metrics: {str(e)}")

# Create single HealthCheck instance
health_check = HealthCheck()

@health_bp.route('/', methods=['GET'])
@cross_origin()
def health():
    """Health check endpoint"""
    try:
        start_time = time.time()
        
        # Get comprehensive health status
        health_status = health_check.get_system_health()
        
        # Determine response code
        is_healthy = health_status['status'] == 'healthy'
        status_code = 200 if is_healthy else 503 if health_status['status'] == 'degraded' else 500
        
        # Record metrics
        metrics_manager.request_count.labels(
            method='GET',
            endpoint='/health',
            status=status_code
        ).inc()
        
        # Record duration
        duration = time.time() - start_time
        metrics_manager.request_latency.labels(
            method='GET',
            endpoint='/health'
        ).observe(duration)
        
        return jsonify(health_status), status_code
            
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500