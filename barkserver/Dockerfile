FROM python:3.11-alpine
WORKDIR /app

# 复制依赖并安装
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY app.py .

# 创建非root用户
RUN adduser -D -u 1000 pythonuser
USER pythonuser

EXPOSE 8000

CMD ["python", "app.py"]
