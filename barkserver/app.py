import json
import os
import logging
from typing import Optional
import httpx
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.responses import JSONResponse
import urllib.parse

# 基础日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 从环境变量获取配置
MATTERMOST_WEBHOOK_URL = os.getenv("MATTERMOST_WEBHOOK_URL", "")
if not MATTERMOST_WEBHOOK_URL:
    logger.error("错误：MATTERMOST_WEBHOOK_URL环境变量未设置！")
    exit(1)

app = FastAPI(title="Bark to Mattermost", version="2.0")

# HTTP客户端
client = httpx.AsyncClient(timeout=10.0)

def parse_bark_data(
    title: str = "",
    body: str = "",
    url: str = Query("", alias="url"),
    group: str = Query("", alias="group"),
    icon: str = Query("", alias="icon"),
    level: str = Query("", alias="level"),
    badge: str = Query("", alias="badge"),
    auto_copy: str = Query("", alias="autoCopy"),
    copy: str = Query("", alias="copy"),
    sound: str = Query("", alias="sound"),
    is_archive: str = Query("", alias="isArchive")
) -> dict:
    """解析Bark的所有参数"""
    return {
        "title": title,
        "body": body,
        "url": url,
        "group": group,
        "icon": icon,
        "level": level,
        "badge": badge,
        "auto_copy": auto_copy,
        "copy": copy,
        "sound": sound,
        "is_archive": is_archive
    }

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
        text_content = "空通知"

    # Mattermost格式
    payload = {"text": text_content}

    # 如果有指定频道，添加到payload
    #if group:
    #    payload["channel"] = group

    return payload

@app.get("/")
async def root():
    return {"status": "running", "service": "bark-to-mattermost"}

@app.get("/{device_key}")
async def bark_without_body(
    device_key: str,
    title: str = "",
    body: str = "",
    url: str = Query("", alias="url"),
    group: str = Query("", alias="group"),
    icon: str = Query("", alias="icon"),
    level: str = Query("", alias="level"),
    badge: str = Query("", alias="badge"),
    auto_copy: str = Query("", alias="autoCopy"),
    copy: str = Query("", alias="copy"),
    sound: str = Query("", alias="sound"),
    is_archive: str = Query("", alias="isArchive")
):
    """Bark API格式1: GET /{device_key}?title=&body=&..."""
    bark_data = {
        "title": urllib.parse.unquote(title) if title else "",
        "body": urllib.parse.unquote(body) if body else "",
        "url": urllib.parse.unquote(url) if url else "",
        "group": urllib.parse.unquote(group) if group else "",
        "icon": urllib.parse.unquote(icon) if icon else "",
        "level": level,
        "badge": badge,
        "auto_copy": auto_copy,
        "copy": urllib.parse.unquote(copy) if copy else "",
        "sound": sound,
        "is_archive": is_archive
    }

    logger.info(f"收到Bark推送: {bark_data.get('title', '无标题')}")

    # 构建并转发
    payload = build_mattermost_payload(bark_data)
    logger.info(f"{str(payload)}")

    try:
        response = await client.post(
            MATTERMOST_WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
    except Exception as e:
        logger.error(f"转发失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"转发失败: {str(e)}")

    return {
        "code": 200,
        "message": "success",
        "timestamp": int(time.time() * 1000)
    }

@app.get("/{device_key}/{title}/{body:path}")
async def bark_with_url_path(
    device_key: str,
    title: str,
    body: str = "",
    url: str = Query("", alias="url"),
    group: str = Query("", alias="group"),
    icon: str = Query("", alias="icon"),
    level: str = Query("", alias="level"),
    badge: str = Query("", alias="badge"),
    auto_copy: str = Query("", alias="autoCopy"),
    copy: str = Query("", alias="copy"),
    sound: str = Query("", alias="sound"),
    is_archive: str = Query("", alias="isArchive")
):
    """Bark API格式2: GET /{device_key}/{title}/{body}?url=&group=&..."""
    bark_data = {
        "title": urllib.parse.unquote(title),
        "body": urllib.parse.unquote(body) if body else "",
        "url": urllib.parse.unquote(url) if url else "",
        "group": urllib.parse.unquote(group) if group else "",
        "icon": urllib.parse.unquote(icon) if icon else "",
        "level": level,
        "badge": badge,
        "auto_copy": auto_copy,
        "copy": urllib.parse.unquote(copy) if copy else "",
        "sound": sound,
        "is_archive": is_archive
    }

    logger.info(f"收到Bark推送: {bark_data['title']}")

    # 构建并转发
    payload = build_mattermost_payload(bark_data)
    logger.info(f"{str(payload)}")

    try:
        response = await client.post(
            MATTERMOST_WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
    except Exception as e:
        logger.error(f"转发失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"转发失败: {str(e)}")

    return {
        "code": 200,
        "message": "success",
        "timestamp": int(time.time() * 1000)
    }

@app.post("/{device_key}")
async def bark_post_json(
    device_key: str,
    request: Request
):
    """Bark API格式3: POST /{device_key} (JSON body)"""
    try:
        bark_data = await request.json()
    except:
        raise HTTPException(status_code=400, detail="无效的JSON格式")

    logger.info(f"收到Bark JSON推送: {bark_data.get('title', '无标题')}")

    # 构建并转发
    payload = build_mattermost_payload(bark_data)
    logger.info(f"{str(payload)}")

    try:
        response = await client.post(
            MATTERMOST_WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
    except Exception as e:
        logger.error(f"转发失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"转发失败: {str(e)}")

    return {
        "code": 200,
        "message": "success",
        "timestamp": int(time.time() * 1000)
    }

@app.post("/push")
@app.post("/webhook")
async def handle_json_webhook(request: Request):
    """通用Webhook接口"""
    try:
        bark_data = await request.json()
    except:
        raise HTTPException(status_code=400, detail="无效的JSON格式")

    logger.info(f"收到通用Webhook: {bark_data.get('title', '无标题')}")

    # 构建并转发
    payload = build_mattermost_payload(bark_data)
    logger.info(f"{str(payload)}")

    try:
        response = await client.post(
            MATTERMOST_WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
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
    logger.info(f"Mattermost Webhook: {MATTERMOST_WEBHOOK_URL[:50]}...")

@app.on_event("shutdown")
async def shutdown():
    await client.aclose()
    logger.info("服务停止")

if __name__ == "__main__":
    import uvicorn
    import time
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
