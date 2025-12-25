import json
import os
import logging
from typing import Optional
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import urllib.parse
import time

# 基础日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 从环境变量获取配置
MATTERMOST_WEBHOOK_BASE_URL = os.getenv("MATTERMOST_WEBHOOK_BASE_URL", "")
if not MATTERMOST_WEBHOOK_BASE_URL:
    logger.error("错误：MATTERMOST_WEBHOOK_BASE_URL环境变量未设置！")
    exit(1)

app = FastAPI(title="Bark to Mattermost", version="2.0")

# HTTP客户端
client = httpx.AsyncClient(timeout=10.0)

def get_mattermost_webhook_url(device_key: str) -> str:
    """根据device_key构建Mattermost Webhook URL"""
    # 确保base URL以斜杠结尾
    base_url = MATTERMOST_WEBHOOK_BASE_URL.rstrip('/')
    # 构建完整的webhook URL: base_url/hooks/device_key
    return f"{base_url}/hooks/{device_key}"

def build_mattermost_payload(bark_data: dict) -> dict:
    """构建Mattermost消息，完整处理Bark参数"""
    title = bark_data.get("title", "")
    body = bark_data.get("body", "")
    group = bark_data.get("group", "")

    # 构建text内容
    lines = []

    # 1. 优先级标识
    level = bark_data.get("level", "")
    if level:
        level_map = {
            "active": "🔴 高优先级",
            "timeSensitive": "🟡 中优先级",
            "passive": "🔵 低优先级"
        }
        lines.append(f"{level_map.get(level, '⚪ 普通')}")

    # 2. 标题
    if title:
        lines.append(f"**{title}**")

    # 3. 正文
    if body:
        lines.append(body)

    # 4. 链接
    url = bark_data.get("url", "")
    if url:
        lines.append(f"[🔗 链接]({url})")

    # 5. 徽章
    badge = bark_data.get("badge", "")
    if badge:
        lines.append(f"徽章: {badge}")

    # 6. 自动复制
    copy_text = bark_data.get("copy", "")
    if copy_text:
        lines.append(f"📋 复制内容: `{copy_text}`")

    # 7. 声音
    sound = bark_data.get("sound", "")
    if sound:
        lines.append(f"🔊 音效: {sound}")

    # 8. 分组
    if group:
        lines.append(f"🏷️ 分组: {group}")

    text_content = "\n".join(lines)
    if not text_content:
        text_content = None  # 标记为空内容

    # Mattermost格式
    return {"text": text_content} if text_content else None

def parse_bark_request(path: str, query_string: str, method: str, body_data: dict = None) -> dict:
    """解析Bark请求，返回device_key和bark_data"""
    # 解析查询参数
    query_params = {}
    if query_string:
        query_params = dict(urllib.parse.parse_qsl(query_string))
    
    # 解析路径
    parts = path.strip('/').split('/')
    
    if len(parts) == 0:
        return None
    
    device_key = parts[0]
    
    # 初始化bark数据
    bark_data = {
        "title": "",
        "body": "",
        "device_key": device_key
    }
    
    # 处理查询参数
    if 'title' in query_params:
        bark_data['title'] = urllib.parse.unquote(query_params['title'])
    if 'body' in query_params:
        bark_data['body'] = urllib.parse.unquote(query_params['body'])
    
    # 其他参数
    for param in ['url', 'group', 'icon', 'copy']:
        if param in query_params:
            bark_data[param] = urllib.parse.unquote(query_params[param])
    
    for param in ['level', 'badge', 'autoCopy', 'sound', 'isArchive']:
        if param in query_params:
            bark_data[param.lower().replace('copy', '_copy')] = query_params[param]
    
    # 处理路径参数
    if len(parts) > 1:
        # 将所有后续部分合并
        path_content = '/'.join(parts[1:])
        decoded_path = urllib.parse.unquote(path_content)
        
        # 如果查询参数中没有标题，尝试从路径中解析
        if not bark_data['title'] and not bark_data['body']:
            # 尝试用第一个斜杠分割标题和正文
            if '/' in decoded_path:
                title_body = decoded_path.split('/', 1)
                bark_data['title'] = title_body[0]
                bark_data['body'] = title_body[1] if len(title_body) > 1 else ""
            else:
                bark_data['title'] = decoded_path
    
    # 合并POST body数据
    if body_data:
        # 更新bark_data，body_data优先
        for key, value in body_data.items():
            if key in ['title', 'body', 'url', 'group', 'icon', 'copy']:
                if isinstance(value, str):
                    bark_data[key] = urllib.parse.unquote(value)
                else:
                    bark_data[key] = str(value)
            elif key.lower() in ['level', 'badge', 'sound', 'isarchive']:
                bark_data[key.lower()] = str(value)
            elif key.lower() == 'autocopy':
                bark_data['auto_copy'] = str(value)
    
    return bark_data

@app.middleware("http")
async def bark_middleware(request: Request, call_next):
    """中间件捕获所有请求并处理Bark格式"""
    # 获取请求信息
    path = request.url.path
    method = request.method
    
    # 只处理Bark相关的路径
    if path == "/":
        return await call_next(request)
    
    logger.info(f"收到请求: {method} {path}")
    
    # 解析请求
    try:
        # 获取body数据
        body_data = None
        if method == "POST":
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                try:
                    body_data = await request.json()
                except:
                    body_data = {}
        
        # 解析Bark请求
        bark_data = parse_bark_request(
            path, 
            str(request.query_params), 
            method, 
            body_data
        )
        
        if not bark_data:
            return JSONResponse(
                status_code=400,
                content={"code": 400, "message": "Invalid request"}
            )
        
        device_key = bark_data.get("device_key", "")
        
        logger.info(f"解析Bark数据: device_key={device_key}, title={bark_data.get('title', '')[:50]}...")
        
        # 构建Mattermost payload
        payload = build_mattermost_payload(bark_data)
        
        # 如果payload为空（标题和正文都为空），则不发送到Mattermost
        if not payload:
            logger.info(f"空通知，不发送到Mattermost (device_key: {device_key})")
            return JSONResponse(
                content={
                    "code": 200,
                    "message": "success",
                    "timestamp": int(time.time() * 1000)
                }
            )
        
        mattermost_url = get_mattermost_webhook_url(device_key)
        
        logger.info(f"目标Mattermost URL: {mattermost_url}")
        
        try:
            response = await client.post(
                mattermost_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            logger.info(f"转发成功: {response.status_code}")
            
            return JSONResponse(
                content={
                    "code": 200,
                    "message": "success",
                    "timestamp": int(time.time() * 1000)
                }
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP错误: {e.response.status_code} - {e.response.text}")
            return JSONResponse(
                status_code=500,
                content={
                    "code": 500,
                    "message": f"转发失败: HTTP {e.response.status_code}",
                    "timestamp": int(time.time() * 1000)
                }
            )
        except Exception as e:
            logger.error(f"转发失败: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={
                    "code": 500,
                    "message": f"转发失败: {str(e)}",
                    "timestamp": int(time.time() * 1000)
                }
            )
            
    except Exception as e:
        logger.error(f"处理请求失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "code": 500,
                "message": f"服务器错误: {str(e)}",
                "timestamp": int(time.time() * 1000)
            }
        )

@app.get("/")
async def root():
    return {"status": "running", "service": "bark-to-mattermost"}

@app.post("/push")
@app.post("/webhook")
async def handle_json_webhook(request: Request):
    """通用Webhook接口"""
    try:
        bark_data = await request.json()
    except:
        raise HTTPException(status_code=400, detail="无效的JSON格式")
    
    # 尝试从JSON中获取device_key，如果没有则使用默认值
    device_key = bark_data.get("device_key", "default")
    
    logger.info(f"收到通用Webhook (device_key: {device_key}): {bark_data.get('title', '无标题')}")

    # 构建Mattermost payload
    payload = build_mattermost_payload(bark_data)
    
    # 如果payload为空（标题和正文都为空），则不发送到Mattermost
    if not payload:
        logger.info(f"空通知，不发送到Mattermost (device_key: {device_key})")
        return {
            "code": 200,
            "message": "success",
            "timestamp": int(time.time() * 1000)
        }
    
    mattermost_url = get_mattermost_webhook_url(device_key)
    
    logger.info(f"目标Mattermost URL: {mattermost_url}")
    logger.info(f"发送内容: {json.dumps(payload, ensure_ascii=False)}")

    try:
        response = await client.post(
            mattermost_url,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        logger.info(f"转发成功: {response.status_code}")
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP错误: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=500, detail=f"转发失败: HTTP {e.response.status_code}")
    except Exception as e:
        logger.error(f"转发失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"转发失败: {str(e)}")

    return {
        "code": 200,
        "message": "success",
        "timestamp": int(time.time() * 1000)
    }

@app.on_event("startup")
async def startup():
    logger.info(f"服务启动，监听端口 8000")
    logger.info(f"Mattermost Webhook Base URL: {MATTERMOST_WEBHOOK_BASE_URL}")

@app.on_event("shutdown")
async def shutdown():
    await client.aclose()
    logger.info("服务停止")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
