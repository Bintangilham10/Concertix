FROM jenkins/jenkins:lts-jdk17

USER root

# Base tools used by the local Jenkins pipeline.
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    git \
    gnupg \
    lsb-release \
    python3 \
    python3-pip \
    python3-venv \
    unzip \
    wget \
    bc \
    build-essential \
    libpq-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Docker CLI and Docker Compose v2 plugin.
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20 for the Next.js build/test stages.
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g npm@latest \
    && rm -rf /var/lib/apt/lists/*

# k6 for performance testing.
RUN curl -fsSL https://dl.k6.io/key.gpg \
        | gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
        > /etc/apt/sources.list.d/k6.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends k6 \
    && rm -rf /var/lib/apt/lists/*

# Trivy for container image vulnerability scanning.
RUN wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key \
        | gpg --dearmor -o /usr/share/keyrings/trivy-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/trivy-archive-keyring.gpg] https://aquasecurity.github.io/trivy-repo/deb $(. /etc/os-release && echo "$VERSION_CODENAME") main" \
        > /etc/apt/sources.list.d/trivy.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends trivy \
    && rm -rf /var/lib/apt/lists/*

# Jenkins plugins needed by the pipeline UI and reports.
RUN jenkins-plugin-cli --plugins \
    git \
    workflow-aggregator \
    docker-workflow \
    sonar \
    htmlpublisher \
    junit \
    pipeline-stage-view \
    ansicolor \
    timestamper

COPY init.groovy.d/ /usr/share/jenkins/ref/init.groovy.d/

USER jenkins
