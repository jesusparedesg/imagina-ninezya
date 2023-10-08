import type { ExtremosCoordenadas } from '@/tipos';
import { calcularPorcentaje, color } from '@/utilidades/ayudas';
import { añoSeleccionado, datosIndicadorMun, datosMunicipios } from '@/utilidades/cerebro';
import { crearLinea, escalaCoordenadas, extremosLugar } from '@enflujo/alquimia';
import type { IMapearCoordenadas } from '@enflujo/alquimia/libreria/modulos/tipos';
import type { Feature, Geometry } from 'geojson';

export default class MapaDetalle extends HTMLElement {
  svg: SVGElement;
  formaDep: SVGGElement;
  municipios: Feature<Geometry>[];
  mapearCoordenadas: IMapearCoordenadas;
  extremosGeo: ExtremosCoordenadas;
  coordenadasAncho: number;
  coordenadasAlto: number;
  formas: { [codigo: string]: SVGPathElement };
  ancho: number;
  alto: number;
  contenedor: HTMLDivElement;

  constructor() {
    super();
    this.mapearCoordenadas;
    this.extremosGeo;
    this.coordenadasAncho = 0;
    this.coordenadasAlto = 0;
    this.formas = {};
    this.ancho = 0;
    this.alto = 0;
  }

  agregarTitulo(nombre: string) {
    const titulo = document.createElement('h2');
    titulo.innerText = nombre;
    this.appendChild(titulo);
  }

  extremos() {
    const { latitudMin, latitudMax, longitudMin, longitudMax } = this.extremosGeo;
    this.mapearCoordenadas = escalaCoordenadas(latitudMin, latitudMax, longitudMin, longitudMax);

    this.coordenadasAncho = longitudMax - longitudMin;
    this.coordenadasAlto = latitudMax - latitudMin;
  }

  crearMapa() {
    this.contenedor = document.createElement('div');
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const patron = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    const linea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.formaDep = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    this.contenedor.className = 'contenedorMapita';
    linea.setAttribute('x', '0');
    linea.setAttribute('y', '0');
    linea.setAttribute('x2', '0');
    linea.setAttribute('y2', '3.5');
    linea.setAttribute('stroke', '#46484A');
    linea.setAttribute('stroke', '#46484A');
    linea.setAttribute('strokeWidth', '1');

    patron.appendChild(linea);
    defs.appendChild(patron);
    this.svg.appendChild(defs);
    this.svg.appendChild(this.formaDep);
    this.contenedor.appendChild(this.svg);

    this.svg.onmouseenter = () => {
      informacion.classList.add('visible');
    };

    this.svg.onmouseleave = () => {
      informacion.classList.remove('visible');
    };

    this.appendChild(this.contenedor);

    this.municipios = datosMunicipios
      .get()
      .features.filter((lugar) => lugar.properties.dep === this.dataset.departamento);

    this.extremosGeo = extremosLugar({
      type: 'FeatureCollection',
      features: this.municipios,
    });

    this.extremos();

    const informacion = document.getElementById('informacion');

    this.municipios.forEach((lugar) => {
      if (lugar.geometry.type === 'Polygon' || lugar.geometry.type === 'MultiPolygon') {
        const formaMunicipio = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        formaMunicipio.setAttribute('id', lugar.properties.codigo);
        formaMunicipio.setAttribute('style', 'fill: url(#sinInfo)');
        formaMunicipio.onmousemove = (evento) => {
          const x = evento.pageX;
          const y = evento.pageY - 30;

          informacion.innerText = `${lugar.properties.nombre}`;

          Object.assign(informacion.style, {
            top: `${y}px`,
            left: `${x}px`,
          });
        };

        this.formas[lugar.properties.codigo] = formaMunicipio;
        this.formaDep.appendChild(formaMunicipio);
      }
    });
  }

  escalar() {
    const columna = document.getElementById('comparativo') as HTMLDivElement;
    const { width } = columna.getBoundingClientRect();
    const margen = 10;

    const dims = {
      ancho: calcularPorcentaje(width, 30),
      alto: calcularPorcentaje(window.innerHeight, 30),
    };

    let alto = dims.ancho * Math.min(this.coordenadasAlto / this.coordenadasAncho, dims.alto / dims.ancho);
    let ancho = alto * (this.coordenadasAncho / this.coordenadasAlto);

    if (ancho >= dims.ancho) {
      ancho -= margen;
    } else if (alto >= dims.alto) {
      alto -= margen;
    } else {
      ancho -= margen;
      alto -= margen;
    }

    Object.assign(this.contenedor.style, { width: `${dims.ancho}px`, height: `${dims.alto}px` });
    this.svg.setAttribute('width', `${ancho}`);
    this.svg.setAttribute('height', `${alto}`);

    if (!this.municipios.length) return;

    this.municipios.forEach((lugar) => {
      if (lugar.geometry.type === 'Polygon' || lugar.geometry.type === 'MultiPolygon') {
        const linea = crearLinea(lugar.geometry, this.mapearCoordenadas, ancho, alto);
        const forma = this.formas[lugar.properties.codigo];
        forma.setAttribute('d', linea);
      }
    });
  }

  pintarMapa() {
    const año = añoSeleccionado.get();
    const datos: [codigo: string] = datosIndicadorMun.get()[año];

    if (datos && datos.length) {
      datos.forEach(([codigoMun, valor]) => {
        const dep = codigoMun.substring(0, 2);

        if (dep === this.id) {
          const forma = this.formas[codigoMun];
          if (forma) {
            if (valor) {
              forma.setAttribute('style', `fill: ${color(+valor)}`);
            } else {
              forma.setAttribute('style', 'fill: url(#sinInfo)');
            }
          } else {
            console.log('No existe lugar con codigo', codigoMun);
          }
        }
      });
    }
  }
}

customElements.define('enflujo-mapita', MapaDetalle);