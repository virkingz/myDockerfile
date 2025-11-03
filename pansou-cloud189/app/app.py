from flask import Flask, render_template, request, jsonify
import requests
import json
import os
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# 配置
SEARCH_API_URL = os.getenv('SEARCH_API_URL', '')
ADD_API_URL = os.getenv('ADD_API_URL', '')
AUTHORIZATION_TOKEN = os.getenv('AUTHORIZATION_TOKEN', '')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['POST'])
def search():
    keyword = request.form.get('keyword', '')

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
        response = requests.post(SEARCH_API_URL, json=payload, timeout=30)
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

        local_path = data.get('localPath', '')
        share_code = data.get('shareCode', '')
        share_access_code = data.get('shareAccessCode', '')

        if not local_path or not share_code:
            return jsonify({'success': False, 'message': '本地路径和分享代码不能为空'})

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
            'Authorization': AUTHORIZATION_TOKEN
        }

        logger.info(f"添加资源: {local_path}, 分享码: {share_code}")
        logger.debug(f"{headers}")
        logger.debug(f"{payload}")

        # 发送请求到API
        response = requests.post(ADD_API_URL, json=payload, headers=headers, timeout=30)
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

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
