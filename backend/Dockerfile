FROM php:8.2-apache

# Habilitar mod_rewrite para el enrutamiento de la API
RUN a2enmod rewrite

# Instalar dependencias necesarias y extensiones PHP (incluyendo poppler-utils para extracción nativa de PDFs)
RUN apt-get update && apt-get install -y \
    libsqlite3-dev \
    poppler-utils \
    && docker-php-ext-install pdo pdo_sqlite pdo_mysql

# Configurar límites de subida en PHP para fotos y padrón masivo
RUN echo "upload_max_filesize = 25M\npost_max_size = 25M\nmemory_limit = 128M" > /usr/local/etc/php/conf.d/uploads.ini

# Copiar el código del backend al contenedor
COPY . /var/www/html/

# Crear las carpetas necesarias si no existen y asignar permisos completos para SQLite y subidas
RUN mkdir -p /var/www/html/data /var/www/html/static/img /var/www/html/static/docs && \
    chown -R www-data:www-data /var/www/html && \
    chmod -R 777 /var/www/html/data /var/www/html/static

EXPOSE 80
