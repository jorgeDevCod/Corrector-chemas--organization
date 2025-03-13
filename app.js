// Elementos DOM principales
const urlsTextarea = document.getElementById( 'urls' );
const generateBtn = document.getElementById( 'generateBtn' );
const clearBtn = document.getElementById( 'clearBtn' );
const exportBtn = document.getElementById( 'exportBtn' );
const resultsDiv = document.getElementById( 'results' );
const errorDiv = document.getElementById( 'error' );

// Contador global para los schemas generados
let schemaCounter = 0;

// Eventos principales
generateBtn.addEventListener( 'click', handleGenerate );
clearBtn.addEventListener( 'click', handleClear );
exportBtn.addEventListener( 'click', handleExport );

// Función principal para generar schemas
async function handleGenerate() {
    // Limpiar resultados previos
    resultsDiv.innerHTML = '';
    errorDiv.textContent = '';
    schemaCounter = 0; // Reiniciar contador

    // Habilitar el botón de exportar
    exportBtn.disabled = true;

    // Obtener y validar URLs
    const urlsInput = urlsTextarea.value.trim();
    if ( !urlsInput ) {
        errorDiv.textContent = 'Por favor, ingresa al menos una URL.';
        return;
    }

    const urls = urlsInput.split( '\n' )
        .map( url => url.trim() )
        .filter( url => url );

    if ( urls.length > 100 ) {
        errorDiv.textContent = 'Por favor, ingresa un máximo de 100 URLs.';
        return;
    }

    // Mostrar número total de URLs a procesar
    const totalUrlsInfo = document.createElement( 'div' );
    totalUrlsInfo.className = 'total-urls-info';
    totalUrlsInfo.textContent = `Procesando ${urls.length} URLs...`;
    resultsDiv.appendChild( totalUrlsInfo );

    // Procesar cada URL
    for ( const url of urls ) {
        try {
            // Validar URL
            if ( !isValidUrl( url ) ) {
                throw new Error( `URL inválida: ${url}` );
            }

            // Indicador de carga
            const loadingContainer = document.createElement( 'div' );
            loadingContainer.className = 'schema-container loading';
            loadingContainer.innerHTML = `<div>Obteniendo título para: ${url}...</div>`;
            resultsDiv.appendChild( loadingContainer );

            // Obtener título de la página
            try {
                const title = await fetchPageTitle( url );
                // Reemplazar contenedor de carga con el schema final
                resultsDiv.removeChild( loadingContainer );
                createSchemaContainer( url, title );
            } catch ( fetchError ) {
                // Si falla el fetch, usar el método anterior como respaldo
                console.error( `Error al obtener título de ${url}:`, fetchError );
                const fallbackTitle = generateTitleFromUrl( url );
                resultsDiv.removeChild( loadingContainer );
                createSchemaContainer( url, fallbackTitle );
            }
        } catch ( error ) {
            // Mostrar error para esta URL específica
            const errorElement = document.createElement( 'div' );
            errorElement.className = 'error';
            errorElement.textContent = error.message;
            resultsDiv.appendChild( errorElement );
        }
    }

    // Actualizar mensaje final
    totalUrlsInfo.textContent = `Procesadas ${urls.length} URLs. Se generaron ${schemaCounter} schemas.`;

    // Habilitar el botón de exportar si se generó al menos un schema
    exportBtn.disabled = schemaCounter === 0;
}

// Función para obtener el título de una página web
async function fetchPageTitle( url ) {
    try {
        // Usar un proxy CORS para hacer la solicitud
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent( url )}`;
        const response = await fetch( proxyUrl );

        if ( !response.ok ) {
            throw new Error( 'Error al obtener la página' );
        }

        const data = await response.json();

        // Extraer el título del HTML recibido
        const parser = new DOMParser();
        const doc = parser.parseFromString( data.contents, 'text/html' );
        const title = doc.querySelector( 'title' )?.textContent || generateTitleFromUrl( url );

        return title.trim();
    } catch ( error ) {
        console.error( 'Error en fetchPageTitle:', error );
        // En caso de error, usar el método de respaldo
        return generateTitleFromUrl( url );
    }
}

// Limpiar todos los campos
function handleClear() {
    urlsTextarea.value = '';
    resultsDiv.innerHTML = '';
    errorDiv.textContent = '';
    schemaCounter = 0;
    exportBtn.disabled = true;
}

// Exportar todos los schemas a Word
function handleExport() {
    // Verificar si hay schemas para exportar
    if ( schemaCounter === 0 ) {
        errorDiv.textContent = 'No hay schemas para exportar.';
        return;
    }

    try {
        // Crear contenido para el documento Word
        let content = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
            'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
            'xmlns="http://www.w3.org/TR/REC-html40">' +
            '<head><meta charset="utf-8"><title>Schemas JSON-LD</title></head>' +
            '<body>';

        // Agregar todos los schemas
        const schemaContainers = document.querySelectorAll( '.schema-container' );
        schemaContainers.forEach( ( container ) => {
            const number = container.querySelector( '.schema-number' ).textContent;
            const url = container.querySelector( '.url-display' ).textContent;
            const title = container.querySelector( '.title-edit input' ).value;
            const schema = container.querySelector( '.schema-display' ).textContent;

            content += `<div style="margin-bottom: 40px; page-break-inside: avoid;">`;
            content += `<h2 style="color: #333;">${number}</h2>`;
            content += `<p style="font-weight: bold;">${url}</p>`;
            content += `<p>Título: ${title}</p>`;
            content += `<pre style="background-color: #f5f5f5; padding: 10px; border: 1px solid #ddd; white-space: pre-wrap; font-family: Consolas, monospace;">${escapeHtml( schema )}</pre>`;
            content += `</div>`;
        } );

        content += '</body></html>';

        // Crear un Blob y descargar
        const blob = new Blob( [ content ], { type: 'application/msword' } );
        const link = document.createElement( 'a' );
        link.href = URL.createObjectURL( blob );
        link.download = 'schemas_json_ld.doc';
        document.body.appendChild( link );
        link.click();
        document.body.removeChild( link );

    } catch ( error ) {
        console.error( 'Error al exportar a Word:', error );
        errorDiv.textContent = 'Error al exportar a Word: ' + error.message;
    }
}

// Función auxiliar para escapar HTML
function escapeHtml( text ) {
    return text
        .replace( /&/g, '&amp;' )
        .replace( /</g, '&lt;' )
        .replace( />/g, '&gt;' )
        .replace( /"/g, '&quot;' )
        .replace( /'/g, '&#039;' );
}

// Verificar si una URL es válida
function isValidUrl( string ) {
    try {
        new URL( string );
        return true;
    } catch ( error ) {
        return false;
    }
}

// Generar un título basado en la URL (función de respaldo)
function generateTitleFromUrl( url ) {
    try {
        const urlObj = new URL( url );
        const pathSegments = urlObj.pathname.split( '/' ).filter( Boolean );

        // Si no hay segmentos de ruta, devolver el dominio
        if ( pathSegments.length === 0 ) {
            return `Página de ${urlObj.hostname.replace( 'www.', '' )}`;
        }

        // Para URLs que contienen malla-curricular
        if ( url.includes( 'malla-curricular' ) ) {
            // Buscar el nombre de la carrera (usualmente es un segmento antes de malla-curricular)
            const carreraIndex = pathSegments.findIndex( segment => segment === 'malla-curricular' ) - 1;
            if ( carreraIndex >= 0 ) {
                let carrera = pathSegments[ carreraIndex ]
                    .replace( /-/g, ' ' )
                    .replace( /\b\w/g, l => l.toUpperCase() );
                return `Malla curricular | ${carrera} | Pregrado UPC`;
            }
        }

        // Para otras URLs, crear un título basado en los segmentos
        const formattedSegments = pathSegments.map( segment =>
            segment.replace( /-/g, ' ' )
                .replace( /\b\w/g, l => l.toUpperCase() )
        );

        return `${formattedSegments.join( ' | ' )} | Pregrado UPC`;
    } catch ( error ) {
        // En caso de error, devolver un título genérico
        return 'Página de Pregrado UPC';
    }
}

// Generar el schema JSON-LD con la URL y título proporcionados
function generateSchema( url, title ) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        "name": "Pregrado",
        "alternateName": title,
        "url": url,
        "logo": "https://pregrado.upc.edu.pe/static/img/logo1.png",
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "(01)630-3333",
            "contactType": "customer service",
            "contactOption": "TollFree",
            "areaServed": "PE",
            "availableLanguage": "es"
        },
        "sameAs": [
            "https://www.facebook.com/upcedu",
            "https://x.com/upcedu",
            "https://www.youtube.com/user/UPCedupe"
        ]
    };

    return `<script type="application/ld+json">\n${JSON.stringify( schema, null, 2 )}\n<\/script>`;
}

// Crear el contenedor de un schema en la interfaz
function createSchemaContainer( url, initialTitle ) {
    // Incrementar contador
    schemaCounter++;

    // Crear el contenedor principal
    const container = document.createElement( 'div' );
    container.className = 'schema-container';

    // Añadir número de schema
    const schemaNumber = document.createElement( 'div' );
    schemaNumber.className = 'schema-number';
    schemaNumber.textContent = `Schema #${schemaCounter}`;
    container.appendChild( schemaNumber );

    // Mostrar la URL
    const urlDisplay = document.createElement( 'div' );
    urlDisplay.className = 'url-display';
    urlDisplay.textContent = `URL: ${url}`;
    container.appendChild( urlDisplay );

    // Campo para editar el título
    const titleEdit = document.createElement( 'div' );
    titleEdit.className = 'title-edit';

    const titleLabel = document.createElement( 'label' );
    titleLabel.textContent = 'Título (editar si es necesario):';
    titleEdit.appendChild( titleLabel );

    const titleInput = document.createElement( 'input' );
    titleInput.type = 'text';
    titleInput.value = initialTitle;
    titleEdit.appendChild( titleInput );

    container.appendChild( titleEdit );

    // Área para mostrar el schema
    const schemaDisplay = document.createElement( 'div' );
    schemaDisplay.className = 'schema-display';
    schemaDisplay.textContent = generateSchema( url, initialTitle );
    container.appendChild( schemaDisplay );

    // Botón para copiar
    const copyBtn = document.createElement( 'button' );
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copiar Schema';
    copyBtn.onclick = function () {
        navigator.clipboard.writeText( schemaDisplay.textContent )
            .then( () => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '¡Copiado!';
                setTimeout( () => {
                    copyBtn.textContent = originalText;
                }, 2000 );
            } )
            .catch( err => {
                console.error( 'Error al copiar: ', err );
            } );
    };
    container.appendChild( copyBtn );

    // Actualizar el schema cuando cambia el título
    titleInput.addEventListener( 'input', function () {
        schemaDisplay.textContent = generateSchema( url, this.value );
    } );

    // Añadir al contenedor de resultados
    resultsDiv.appendChild( container );
}
