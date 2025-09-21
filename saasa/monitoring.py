"""
Monitoring and metrics collection for production deployment
"""
import time
import psutil
import logging
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, g
import json

logger = logging.getLogger(__name__)

class MetricsCollector:
    """Collect application metrics"""
    
    def __init__(self):
        self.request_count = 0
        self.error_count = 0
        self.response_times = []
        self.start_time = datetime.now()
    
    def record_request(self, response_time, status_code):
        """Record a request"""
        self.request_count += 1
        self.response_times.append(response_time)
        
        if status_code >= 400:
            self.error_count += 1
    
    def get_metrics(self):
        """Get current metrics"""
        uptime = datetime.now() - self.start_time
        avg_response_time = sum(self.response_times) / len(self.response_times) if self.response_times else 0
        
        return {
            'uptime_seconds': uptime.total_seconds(),
            'request_count': self.request_count,
            'error_count': self.error_count,
            'error_rate': self.error_count / self.request_count if self.request_count > 0 else 0,
            'avg_response_time': avg_response_time,
            'system_cpu': psutil.cpu_percent(),
            'system_memory': psutil.virtual_memory().percent,
            'system_disk': psutil.disk_usage('/').percent
        }

# Global metrics collector
metrics = MetricsCollector()

def monitor_request(f):
    """Decorator to monitor requests"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        
        try:
            response = f(*args, **kwargs)
            response_time = time.time() - start_time
            
            # Record metrics
            status_code = getattr(response, 'status_code', 200) if hasattr(response, 'status_code') else 200
            metrics.record_request(response_time, status_code)
            
            # Log request
            logger.info(f"Request: {request.method} {request.path} - {status_code} - {response_time:.3f}s")
            
            return response
            
        except Exception as e:
            response_time = time.time() - start_time
            metrics.record_request(response_time, 500)
            
            logger.error(f"Request error: {request.method} {request.path} - {str(e)}")
            raise
    
    return decorated_function

def log_performance(f):
    """Decorator to log performance metrics"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        start_memory = psutil.virtual_memory().used
        
        try:
            result = f(*args, **kwargs)
            
            end_time = time.time()
            end_memory = psutil.virtual_memory().used
            
            execution_time = end_time - start_time
            memory_used = end_memory - start_memory
            
            logger.info(f"Performance - {f.__name__}: {execution_time:.3f}s, Memory: {memory_used / 1024 / 1024:.2f}MB")
            
            return result
            
        except Exception as e:
            logger.error(f"Performance error in {f.__name__}: {str(e)}")
            raise
    
    return decorated_function

def health_check():
    """Comprehensive health check"""
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Application metrics
        app_metrics = metrics.get_metrics()
        
        # Determine health status
        is_healthy = (
            cpu_percent < 80 and
            memory.percent < 80 and
            disk.percent < 90 and
            app_metrics['error_rate'] < 0.1
        )
        
        status = "healthy" if is_healthy else "unhealthy"
        
        return {
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'uptime_seconds': app_metrics['uptime_seconds'],
            'system': {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'disk_percent': disk.percent,
                'memory_available_gb': memory.available / (1024**3)
            },
            'application': {
                'request_count': app_metrics['request_count'],
                'error_count': app_metrics['error_count'],
                'error_rate': app_metrics['error_rate'],
                'avg_response_time': app_metrics['avg_response_time']
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

def setup_monitoring(app):
    """Setup monitoring for the Flask app"""
    
    @app.before_request
    def before_request():
        g.start_time = time.time()
    
    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            response_time = time.time() - g.start_time
            metrics.record_request(response_time, response.status_code)
        
        # Add monitoring headers
        response.headers['X-Response-Time'] = f"{response_time:.3f}s"
        response.headers['X-Request-ID'] = request.headers.get('X-Request-ID', 'unknown')
        
        return response
    
    @app.route('/metrics')
    def get_metrics():
        """Get application metrics"""
        return jsonify(metrics.get_metrics())
    
    @app.route('/health')
    def health():
        """Health check endpoint"""
        health_data = health_check()
        status_code = 200 if health_data['status'] == 'healthy' else 503
        return jsonify(health_data), status_code

class PerformanceLogger:
    """Performance logging utility"""
    
    def __init__(self, name):
        self.name = name
        self.logger = logging.getLogger(f"performance.{name}")
    
    def log_operation(self, operation_name, duration, **kwargs):
        """Log a performance operation"""
        self.logger.info(f"{operation_name}: {duration:.3f}s", extra=kwargs)
    
    def log_memory_usage(self, operation_name, memory_before, memory_after):
        """Log memory usage"""
        memory_used = memory_after - memory_before
        self.logger.info(f"{operation_name} memory usage: {memory_used / 1024 / 1024:.2f}MB")

def create_performance_logger(name):
    """Create a performance logger"""
    return PerformanceLogger(name)

# Usage examples:
# perf_logger = create_performance_logger('document_processing')
# perf_logger.log_operation('load_documents', 2.5, file_count=2)
# perf_logger.log_memory_usage('vector_store_setup', 100, 200)
