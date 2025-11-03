FROM python:3.9-slim as builder

WORKDIR /build
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# 运行阶段
FROM python:3.9-slim

WORKDIR /app

# 从构建阶段复制已安装的包
COPY --from=builder /root/.local /root/.local

# 复制应用代码
COPY ./app /app

# 确保 Python 可以找到用户安装的包
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app

# 设置环境变量
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

EXPOSE 5000
CMD ["python", "app.py"]
