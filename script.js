'use strict';

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        //para que funciones con es6
        // this.date = ...
        // this.id = ...
        this.coords = coords; //array of latitude and longitude
        this.distance = distance; //km
        this.duration = duration; //min
    }

    _setDescription() {
        const months = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
            months[this.date.getMonth()]
        } ${this.date.getDate()}`;
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        //con super ya mandas llamar a constructor del padre
        super(coords, distance, duration);
        this.cadence = cadence;
        //calcular el paso inmediataente
        this.calcPace();
        this._setDescription();
    }
    calcPace() {
        //min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}
class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        //con super ya mandas llamar a constructor del padre
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed() {
        //aqui la duracion esta en horas
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

//TEST
const run1 = new Running([30, -12], 5.2, 24, 178);
const cyc1 = new Cycling([30, -12], 27, 95, 523);
console.log(run1, cyc1);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoomLevel = 13;

    constructor() {
        this._getPosition();

        //get data from local storage
        this._getLocalStorage();

        // console.log('firstName', firstName);
        //dentro de los event handler el this siempre será el del dom element al que se atachea y no al appObject
        form.addEventListener('submit', this._newWorkout.bind(this));

        inputType.addEventListener('change', this._toggleElevationField.bind(this));
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation) {
            //recibe dos callbacks, una con success y otra con error
            //el problema es que se llama como una funcion normal y en una llamada de una funcion normal el this se hace como indefinido
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('Could not get your position');
            });
        }
    }

    //a esta ya le llega la posicion
    _loadMap(position) {
        //se llama con un parametro forzosamente
        const { latitude, longitude } = position.coords;
        // console.log(latitude, longitude);
        // console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);
        const coords = [latitude, longitude];

        //lo que pasamos en map es el id del elemento que se va a poner sobre el mapa
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel); //l es el namespace que nos da, el segundo argumento es el nivel de zoom
        //este es el objeto generado por leaflet

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
            //con esta url se cambia la apariencia ^
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.#map);

        // L.marker(coords).addTo(map).bindPopup('A pretty CSS3 popup.<br> Easily customizable.').openPopup();

        //HANDLING CLICKS ON MAP
        //como un evento normal en leaflet pero creado por la libreria
        this.#map.on('click', this._showForm.bind(this));

        //para este punto el mapa ya deberia de estar funcionando
        this.#workouts.forEach((workout) => {
            // this._renderWorkout(workout);
            this._renderWorkoutMarker(workout); //no funciona porque es justo al inicio y el mapa no ha cargado
        });
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden'); //que aparezca
        //que se haga un focus
        inputDistance.focus();
    }

    _hideForm() {
        //clear input fields
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => {
            form.style.display = 'grid';
        }, 1000);
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        e.preventDefault();
        //agarrar datos de la forma:
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        //ver si es valida
        const validInputs = (...inputs) => {
            //solo regresa true si todos los elementos de la coleccion devuelven true
            return inputs.every((inp) => Number.isFinite(inp));
        };

        const allPositive = (...inputs) => {
            return inputs.every((inp) => inp > 0);
        };

        //dependiendo del tipo se crea un objeto u otro
        if (type === 'running') {
            const cadence = +inputCadence.value;
            if (!validInputs(distance, duration, cadence) && !allPositive(distance, duration, cadence))
                return alert('All form inputs most be positive numbers');
            //como es const o let solo esta en su bloque
            // const workout = new Running([lat, lng], distance, duration, cadence);
            workout = new Running([lat, lng], distance, duration, cadence);
        }
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (!validInputs(distance, duration, elevation) && !allPositive(distance, duration))
                return alert('All form inputs most be positive numbers');
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        //añadir l nuevo objeto a un arreglo
        this.#workouts.push(workout);

        //se renderea como marca
        //como se llama como metodo y no callback no hay pedo
        this._renderWorkoutMarker(workout);

        //se renderea en la lista
        this._renderWorkout(workout);

        this._hideForm();

        //set local storage
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        //                                         crea el marker con la str que pasemos, o un objeto
        // L.marker([lat, lng]).addTo(map).bindPopup('Workout').openPopup();
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 150,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`,
                })
            )
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

        if (workout.type === 'running')
            html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;

        if (workout.type === 'cycling')
            html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find((el) => el.id === workoutEl.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        });

        //usando la interfaz publica
        // workout.click(); //se deshabilita para que no haya problemas porque la herencia de prototipos se pierde
    }

    //set local storage
    _setLocalStorage() {
        // se crea un valor en el local storage bajo la llave workouts y con una cadena como segundo argumento
        localStorage.setItem('workouts', JSON.stringify(this.#workouts)); //te hace blocking
    }

    _getLocalStorage() {
        //regresa una cadena
        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach((workout) => {
            this._renderWorkout(workout);
            // this._renderWorkoutMarker(workout); //no funciona porque es justo al inicio y el mapa no ha cargado
        });
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload(); //location es el objeto del browser
    }
}

//el codigo global se va a ejecutar en cuanto carga la aplicaion
const AppMapty = new App();
