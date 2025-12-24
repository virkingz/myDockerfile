import json
import os
import logging
from typing import Optional
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

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
    logger.error("请设置：docker run -e MATTERMOST_WEBHOOK_URL=你的webhook地址")
    exit(1)

app = FastAPI(title="Bark to Mattermost", version="1.0")

# HTTP客户端
client = httpx.AsyncClient(timeout=10.0)

def build_mattermost_payload(bark_data: dict) -> dict:
    """构建Mattermost消息"""
    title = bark_data.get("title", "Bark通知")
    body = bark_data.get("body", "")
    group = bark_data.get("group", "")

    # 构建text内容
    lines = []
    if title:
        lines.append(f"**{title}**")
    if body:
        lines.append(body)
    if bark_data.get("url"):
        lines.append(f"🔗 {bark_data['url']}")

    text_content = "\n".join(lines)

    # Mattermost格式：{"text": "内容"}
    payload = {"text": text_content}

    # 如果有指定频道，添加到payload
    if group:
        payload["channel"] = group

    return payload

@app.get("/")
async def root():
    return {"status": "running", "service": "bark-to-mattermost"}

@app.get("/{device_key}/{title}/{body:path}")
async def handle_bark_url(
    device_key: str,
    title: str,
    body: Optional[str] = None
):
    """处理Bark URL格式：/key/title/body"""
    import urllib.parse
    decoded_title = urllib.parse.unquote(title)
    decoded_body = urllib.parse.unquote(body) if body else ""

    bark_data = {
        "title": decoded_title,
        "body": decoded_body
    }

    logger.info(f"收到推送：{decoded_title}")

    # 构建并转发
    payload = build_mattermost_payload(bark_data)

    try:
        response = await client.post(
            MATTERMOST_WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
    except Exception as e:
        logger.error(f"转发失败：{str(e)}")
        raise HTTPException(status_code=500, detail=f"转发失败：{str(e)}")

    return {
        "code": 200,
        "message": "转发成功",
        "timestamp": int(time.time() * 1000)
    }

@app.post("/push")
@app.post("/webhook")
async def handle_json_webhook(request: Request):
    """处理JSON格式的推送"""
    try:
        bark_data = await request.json()
    except:
        raise HTTPException(status_code=400, detail="无效的JSON格式")

    logger.info(f"收到JSON推送：{bark_data.get('title', '无标题')}")

    # 构建并转发
    payload = build_mattermost_payload(bark_data)

    try:
        response = await client.post(
            MATTERMOST_WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
    except Exception as e:
        logger.error(f"转发失败：{str(e)}")
        raise HTTPException(status_code=500, detail=f"转发失败：{str(e)}")

    return {
        "code": 200,
        "message": "转发成功",
        "timestamp": int(time.time() * 1000)
    }

@app.on_event("startup")
async def startup():
    logger.info(f"服务启动，Mattermost Webhook: {MATTERMOST_WEBHOOK_URL[:50]}...")

@app.on_event("shutdown")
async def shutdown():
    await client.aclose()
    logger.info("服务停止")

if __name__ == "__main__":
    import uvicorn
    import time
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
