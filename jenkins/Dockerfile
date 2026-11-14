# Jenkins avec Node et Chromium : de quoi lancer les tests du serveur MCP et de l'agent.
FROM jenkins/jenkins:lts

USER root
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs psmisc \
    && rm -rf /var/lib/apt/lists/*

# Navigateur partagé : installé une fois dans l'image, lisible par l'utilisateur jenkins.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx -y playwright@1.65.0 install --with-deps chromium \
    && chmod -R a+rx /ms-playwright \
    && rm -rf /var/lib/apt/lists/*

# Le dépôt est monté depuis Windows : son propriétaire diffère de l'utilisateur jenkins.
RUN git config --system --add safe.directory '*'

USER jenkins
