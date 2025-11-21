from flask import Flask, render_template, request, jsonify
import requests
import json
import os
import logging
from datetime import datetime, timedelta

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# 配置
SEARCH_API_URL = os.getenv('SEARCH_API_URL', '')
ADD_API_URL = os.getenv('ADD_API_URL', '')
USERNAME = os.getenv('USERNAME', '')
PASSWORD = os.getenv('PASSWORD', '')

# 全局变量存储token和过期时间
auth_token = None
token_expiry = None

def get_auth_token():
    """获取认证token"""
    global auth_token, token_expiry

    login_api_url=ADD_API_URL+"/api/user/login"
    # 如果token存在且未过期，直接返回
    if auth_token and token_expiry and datetime.now() < token_expiry:
        return auth_token

    try:
        # 准备登录请求数据
        payload = {
            "username": USERNAME,
            "password": PASSWORD
        }

        headers = {
            'Content-Type': 'application/json'
        }

        logger.info(f"正在获取认证token，用户名: {USERNAME}")

        # 发送登录请求
        response = requests.post(login_api_url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        response_data = response.json()

        # 检查登录响应
        if 'accessToken' in response_data:
            # 从响应中获取accessToken
            access_token = response_data.get('accessToken')
            token_type = response_data.get('tokenType', 'Bearer')
            expires_in = response_data.get('expiresIn', 86400)  # 默认24小时

            if access_token:
                # 组合完整的token（包含token类型）
                full_token = f"{token_type} {access_token}"
                auth_token = full_token

                # 设置token过期时间（根据expiresIn设置，预留5分钟缓冲）
                token_expiry = datetime.now() + timedelta(seconds=expires_in - 300)

                logger.info(f"认证token获取成功，有效期至: {token_expiry}")
                return auth_token
            else:
                logger.error("登录响应中accessToken为空")
                return None
        else:
            error_msg = response_data.get('message', '登录失败')
            logger.error(f"登录API返回错误: {error_msg}")
            return None

    except requests.exceptions.RequestException as e:
        logger.error(f"登录请求异常: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"登录处理异常: {str(e)}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['POST'])
def search():
    keyword = request.form.get('keyword', '')
    url = SEARCH_API_URL + "/api/search"
    if not keyword:
        return jsonify({'success': False, 'message': '搜索关键词不能为空'})

    # 准备API请求数据
    payload = {
        "kw": keyword,
        "cloud_types": ["tianyi"]
    }

    try:
        logger.info(f"搜索关键词: {keyword}")
        # 发送请求到API
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        response_data = response.json()

        # 检查API响应状态
        if response_data.get('code') == 0:
            results = response_data.get('data', {}).get('merged_by_type', {}).get('tianyi', [])
            logger.info(f"搜索成功，找到 {len(results)} 条结果")
            return jsonify({'success': True, 'results': results})
        else:
            error_msg = response_data.get('message', 'API请求失败')
            logger.error(f"搜索API返回错误: {error_msg}")
            return jsonify({'success': False, 'message': error_msg})

    except requests.exceptions.RequestException as e:
        logger.error(f"搜索请求异常: {str(e)}")
        return jsonify({'success': False, 'message': f'网络请求失败: {str(e)}'})
    except Exception as e:
        logger.error(f"搜索处理异常: {str(e)}")
        return jsonify({'success': False, 'message': f'搜索处理出错: {str(e)}'})

@app.route('/add', methods=['POST'])
def add():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': '无效的请求数据'})
        url = ADD_API_URL + "/api/storage/add"
        local_path = data.get('localPath', '')
        share_code = data.get('shareCode', '')
        share_access_code = data.get('shareAccessCode', '')

        if not local_path or not share_code:
            return jsonify({'success': False, 'message': '本地路径和分享代码不能为空'})

        # 获取认证token
        token = get_auth_token()
        if not token:
            return jsonify({'success': False, 'message': '获取认证token失败，请检查用户名和密码'})

        # 准备添加API请求数据
        payload = {
            "localPath": local_path,
            "protocol": "share",
            "cloudToken": 1,
            "shareCode": share_code,
            "shareAccessCode": share_access_code
        }

        headers = {
            'Content-Type': 'application/json',
            'Authorization': token
        }

        logger.info(f"添加资源: {local_path}, 分享码: {share_code}")

        # 发送请求到API
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        response_data = response.json()

        # 检查API响应状态
        if 'id' in response_data:
            resource_id = response_data.get('id')
            logger.info(f"添加资源成功: {local_path}, 资源ID: {resource_id}")
            return jsonify({'success': True, 'message': f'添加成功，资源ID: {resource_id}'})
        else:
            error_msg = response_data.get('message', '添加失败')
            logger.error(f"添加API返回错误: {error_msg}")
            return jsonify({'success': False, 'message': error_msg})

    except requests.exceptions.RequestException as e:
        logger.error(f"添加请求异常: {str(e)}")
        return jsonify({'success': False, 'message': f'网络请求失败: {str(e)}'})
    except Exception as e:
        logger.error(f"添加处理异常: {str(e)}")
        return jsonify({'success': False, 'message': f'添加处理出错: {str(e)}'})

@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'service': 'pansou-search'})

@app.route('/token-status')
def token_status():
    """检查token状态（用于调试）"""
    token = get_auth_token()
    status = {
        'has_token': token is not None,
        'token_expiry': token_expiry.isoformat() if token_expiry else None,
        'current_time': datetime.now().isoformat(),
        'token_valid': token_expiry and datetime.now() < token_expiry if token_expiry else False
    }
    return jsonify(status)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
