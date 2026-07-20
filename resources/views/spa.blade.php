<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Tenth Lining – Professional Court Document Formatting</title>
    <meta name="description" content="Automatically format your legal documents with page numbering and tenth lining per Kenyan Court of Appeal Rules. Pay securely via M-Pesa.">
    <link rel="icon" type="image/svg+xml" href="/tenth-lining/public/favicon.svg">
    <link rel="alternate icon" href="/tenth-lining/public/favicon.ico">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Inter:wght@300;400;500;600;700;800;900&family=Lato:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;600;700&family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Roboto:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    
</head>
<body>
    <div id="app"></div>
    <script>
        window.__APP_CONFIG__ = {
            baseUrl: '/tenth-lining',
            csrfToken: '{{ csrf_token() }}',
        };
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs" type="module"></script>
    <script src="/tenth-lining/public/spa/app.js?v={{ time() }}" type="module"></script>
</body>
</html>
