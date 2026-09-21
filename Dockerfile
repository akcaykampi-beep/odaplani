FROM php:8.2-apache

# MySQL PDO sürücüsünü kur
RUN docker-php-ext-install pdo pdo_mysql

# Proje dosyalarını Apache klasörüne kopyala
COPY . /var/www/html/

# Render'ın dinamik PORT değerini Apache portuna ata
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

EXPOSE 80

CMD ["apache2-foreground"]
