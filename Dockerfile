FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  ca-certificates \
  build-essential \
  pkg-config \
  libssl-dev \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libsqlite3-dev \
  git \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get update \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src-tauri/Cargo.toml src-tauri/Cargo.toml
COPY src-tauri/Cargo.lock src-tauri/Cargo.lock

COPY . .

CMD ["bash", "-lc", "npm run lint && npm run build && cd src-tauri && cargo check"]
