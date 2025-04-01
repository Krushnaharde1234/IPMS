import React, { useState, useEffect } from 'react';
import './style.css';

const CurrentDateAndTime = () => {
    const [currentDateTime, setCurrentDateTime] = useState(new Date());

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    const formatDateTime = (date) => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    return (
        <span>{formatDateTime(currentDateTime)} (UTC)</span>
    );
};

function App() {
    const [polesData, setPolesData] = useState(() => {
        const storedData = localStorage.getItem('polesData');
        return storedData ? JSON.parse(storedData) : {
            imbalanced: [],
            balanced: [],
            aging: [],
            locations: [],
        };
    });

    const [activePage, setActivePage] = useState('dashboard');

    useEffect(() => {
        localStorage.setItem('polesData', JSON.stringify(polesData));
    }, [polesData]);

    const handleDataUpdate = (newData) => {
        setPolesData(newData);
    };

    // Imbalance Entry Component Logic
    const [imbalancePolarity, setImbalancePolarity] = useState('');
    const [imbalanceRating, setImbalanceRating] = useState('');
    const [imbalanceQuantities, setImbalanceQuantities] = useState({});
    const [imbalanceValidationErrors, setImbalanceValidationErrors] = useState({});

    const handleImbalancePolarityChange = (e) => {
        setImbalancePolarity(e.target.value);
        setImbalanceQuantities({});
    };

    const handleImbalanceRatingChange = (e) => {
        setImbalanceRating(e.target.value);
    };

    const handleImbalanceQuantityChange = (poleNumber, value) => {
        setImbalanceQuantities({ ...imbalanceQuantities, [poleNumber]: value });
    };

    const validateImbalance = () => {
        let errors = {};
        if (!imbalancePolarity) errors.polarity = 'Polarity is required';
        if (!imbalanceRating) errors.rating = 'Rating is required';
        if (imbalanceRating && (isNaN(imbalanceRating) || parseFloat(imbalanceRating) < 0.5 || parseFloat(imbalanceRating) > 80)) {
            errors.rating = 'Rating must be between 0.5 and 80';
        }

        let numberOfPoles = imbalancePolarity ? parseInt(imbalancePolarity.charAt(0)) : 0;
        for (let i = 1; i <= numberOfPoles; i++) {
            if (!imbalanceQuantities[`pole${i}`]) {
                errors[`pole${i}`] = `Quantity for Pole ${i} is required`;
            }
        }

        setImbalanceValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const calculateImbalance = () => {
        if (!validateImbalance()) {
            return null;
        }

        let numberOfPoles = imbalancePolarity ? parseInt(imbalancePolarity.charAt(0)) : 0;
        let poleQuantities = [];
        for (let i = 1; i <= numberOfPoles; i++) {
            poleQuantities.push(parseInt(imbalanceQuantities[`pole${i}`]));
        }

        const balancedQty = Math.min(...poleQuantities);
        const imbalanceQty = poleQuantities.reduce((sum, qty) => sum + qty, 0) - (balancedQty * numberOfPoles);

        return { balancedQty, imbalanceQty };
    };

    const assignLocation = () => {
        const imbalanceResult = calculateImbalance();
        if (!imbalanceResult) return;

        const { balancedQty, imbalanceQty } = imbalanceResult;
        let availableLocation = null;
        let updatedLocations = [...polesData.locations];
        let newImbalancedPole = {
            polarity: imbalancePolarity,
            rating: imbalanceRating,
            imbalanceQty,
            balancedQty,
            location: null,
            daysInactive: 0
        };

        for (let i = 0; i < updatedLocations.length; i++) {
            if (updatedLocations[i].rating === imbalanceRating && updatedLocations[i].remainingCapacity > 0) {
                availableLocation = updatedLocations[i];
                break;
            }
        }

        if (availableLocation) {
            const spaceAvailable = Math.min(availableLocation.remainingCapacity, imbalanceQty);
            availableLocation.currentQty += spaceAvailable;
            availableLocation.remainingCapacity -= spaceAvailable;
            newImbalancedPole.location = availableLocation.location;
            newImbalancedPole.imbalanceQty = spaceAvailable;
        } else {
            let nextLocation = `A${updatedLocations.length + 1}`;
            updatedLocations.push({
                location: nextLocation,
                rating: imbalanceRating,
                polarity: imbalancePolarity,
                currentQty: imbalanceQty,
                remainingCapacity: Math.max(0, 25 - imbalanceQty),
                status: imbalanceQty > 0 ? 'Active' : 'Balanced'
            });
            newImbalancedPole.location = nextLocation;
        }

        const updatedPolesData = { ...polesData };
        updatedPolesData.imbalanced = [...updatedPolesData.imbalanced, newImbalancedPole];
        updatedPolesData.locations = updatedLocations;
        handleDataUpdate(updatedPolesData);
        handleImbalanceReset();
    };

    const handleImbalanceSubmit = (e) => {
        e.preventDefault();
        assignLocation();
    };

    const handleImbalanceReset = () => {
        setImbalancePolarity('');
        setImbalanceRating('');
        setImbalanceQuantities({});
        setImbalanceValidationErrors({});
    };

    let numberOfPoles = imbalancePolarity ? parseInt(imbalancePolarity.charAt(0)) : 0;
    let quantityInputs = [];
    for (let i = 1; i <= numberOfPoles; i++) {
        quantityInputs.push(
            <div key={i} className="form-group">
                <label htmlFor={`pole${i}`}>Pole {i} Quantity:</label>
                <input
                    type="number"
                    id={`pole${i}`}
                    value={imbalanceQuantities[`pole${i}`] || ''}
                    onChange={(e) => handleImbalanceQuantityChange(`pole${i}`, e.target.value)}
                    className={imbalanceValidationErrors[`pole${i}`] ? 'is-invalid' : ''}
                />
                {imbalanceValidationErrors[`pole${i}`] && <p className="validation-error">{imbalanceValidationErrors[`pole${i}`]}</p>}
            </div>
        );
    }

    // Balance Entry Component Logic
    const [balancePolarity, setBalancePolarity] = useState('');
    const [balanceRating, setBalanceRating] = useState('');
    const [balancedQuantity, setBalancedQuantity] = useState('');
    const [balanceLocation, setBalanceLocation] = useState('');
    const [balanceValidationErrors, setBalanceValidationErrors] = useState({});

    const getExistingRatings = () => {
        const ratings = new Set();
        polesData.imbalanced.forEach(pole => {
            ratings.add(pole.rating);
        });
        return Array.from(ratings);
    };

    const getExistingPolarities = () => {
        const polarities = new Set();
        polesData.imbalanced.forEach(pole => {
            polarities.add(pole.polarity);
        });
        return Array.from(polarities);
    };

    const getExistingLocations = () => {
        const locations = new Set();
        polesData.imbalanced.forEach(pole => {
            locations.add(pole.location);
        });
        return Array.from(locations);
    };

    const validateBalance = () => {
        let errors = {};
        if (!balancePolarity) errors.polarity = 'Polarity is required';
        if (!balanceRating) errors.rating = 'Rating is required';
        if (!balancedQuantity) errors.balancedQuantity = 'Balanced Quantity is required';
        if (!balanceLocation) errors.location = 'Location is required';
        if (isNaN(balancedQuantity) || parseFloat(balancedQuantity) <= 0) {
            errors.balancedQuantity = 'Balanced Quantity must be a positive number';
        }

        setBalanceValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleBalanceSubmit = (e) => {
        e.preventDefault();
        if (!validateBalance()) {
            return;
        }

        const imbalancedPoleIndex = polesData.imbalanced.findIndex(
            pole => pole.polarity === balancePolarity && pole.rating === balanceRating && pole.location === balanceLocation
        );

        if (imbalancedPoleIndex === -1) {
            alert('No matching imbalanced pole entry found.');
            return;
        }

        const imbalancedPole = { ...polesData.imbalanced[imbalancedPoleIndex] };
        const enteredBalancedQuantity = parseInt(balancedQuantity);

        if (enteredBalancedQuantity > imbalancedPole.imbalanceQty) {
            alert('Entered balanced quantity exceeds the imbalanced quantity.');
            return;
        }

        imbalancedPole.imbalanceQty -= enteredBalancedQuantity;

        const newBalancedPole = {
            polarity: balancePolarity,
            rating: balanceRating,
            location: balanceLocation,
            balancedQty: enteredBalancedQuantity,
            balanceDate: new Date().toLocaleDateString()
        };

        const updatedPolesData = { ...polesData };
        if (imbalancedPole.imbalanceQty === 0) {
            updatedPolesData.balanced = [...updatedPolesData.balanced, newBalancedPole];
            updatedPolesData.imbalanced.splice(imbalancedPoleIndex, 1);
        } else {
            updatedPolesData.imbalanced[imbalancedPoleIndex] = imbalancedPole;
        }

        handleDataUpdate(updatedPolesData);
        handleBalanceReset();
    };

    const handleBalanceReset = () => {
        setBalancePolarity('');
        setBalanceRating('');
        setBalancedQuantity('');
        setBalanceLocation('');
        setBalanceValidationErrors({});
    };

    // Location Management Component Logic
    const [newLocation, setNewLocation] = useState('');
    const [newRating, setNewRating] = useState('');
    const [newPolarity, setNewPolarity] = useState('');
    const [locationValidationErrors, setLocationValidationErrors] = useState({});

    const validateLocation = () => {
        let errors = {};
        if (!newLocation) errors.newLocation = 'Location is required';
        if (!newRating) errors.newRating = 'Rating is required';
        if (!newPolarity) errors.newPolarity = 'Polarity is required';
        if (polesData.locations.find(loc => loc.location === newLocation)) {
            errors.newLocation = 'Location already exists';
        }

        setLocationValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAddLocation = () => {
        if (!validateLocation()) {
            return;
        }

        const updatedPolesData = { ...polesData };
        updatedPolesData.locations.push({
            location: newLocation,
            rating: newRating,
            polarity: newPolarity,
            currentQty: 0,
            remainingCapacity: 25,
            status: 'Balanced'
        });

        handleDataUpdate(updatedPolesData);
        handleLocationReset();
    };

    const handleLocationReset = () => {
        setNewLocation('');
        setNewRating('');
        setNewPolarity('');
        setLocationValidationErrors({});
    };

    // Settings Component Logic (Example - Clear Data)
    const handleClearData = () => {
        localStorage.removeItem('polesData');
        setPolesData({
            imbalanced: [],
            balanced: [],
            aging: [],
            locations: [],
        });
    };

    // Dashboard Component Logic
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentTime(new Date());

            const updatedPolesData = { ...polesData };
            updatedPolesData.imbalanced = updatedPolesData.imbalanced.map(pole => {
                const daysInactive = pole.daysInactive ? pole.daysInactive + 1 : 1;
                return { ...pole, daysInactive };
            });

            updatedPolesData.aging = [
                ...updatedPolesData.aging,
                ...updatedPolesData.imbalanced.filter(pole => pole.daysInactive >= 15)
            ];
            updatedPolesData.imbalanced = updatedPolesData.imbalanced.filter(pole => pole.daysInactive < 15);
            handleDataUpdate(updatedPolesData);

        }, 5000);

        return () => clearInterval(intervalId);
    }, [polesData, handleDataUpdate]);

    // Render Functions
    const renderDashboard = () => (
        <div className="dashboard">
            <div className="dashboard-section imbalanced">
                <h2>Imbalanced Poles</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Polarity</th>
                            <th>Rating (A)</th>
                            <th>Location</th>
                            <th>Imbalance Qty</th>
                            <th>Balanced Qty</th>
                            <th>Days Inactive</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {polesData.imbalanced.map((pole, index) => (
                            <tr key={index} style={{ color: pole.daysInactive >= 15 ? 'red' : 'white' }}>
                                <td>{pole.polarity}</td>
                                <td>{pole.rating}</td>
                                <td>{pole.location}</td>
                                <td>{pole.imbalanceQty}</td>
                                <td>{pole.balancedQty || 0}</td>
                                <td>{pole.daysInactive || 0}</td>
                                <td>
                                    <button onClick={() => {
                                        const updatedPolesData = { ...polesData };
                                        updatedPolesData.imbalanced.splice(index, 1);
                                        handleDataUpdate(updatedPolesData);
                                    }}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="dashboard-section balanced">
                <h2>Balanced Poles</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Polarity</th>
                            <th>Rating (A)</th>
                            <th>Location</th>
                            <th>Balanced Qty</th>
                            <th>Balance Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {polesData.balanced.map((pole, index) => (
                            <tr key={index}>
                                <td>{pole.polarity}</td>
                                <td>{pole.rating}</td>
                                <td>{pole.location}</td>
                                <td>{pole.balancedQty}</td>
                                <td>{pole.balanceDate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="dashboard-section aging">
                <h2>Aging Poles</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Polarity</th>
                            <th>Rating (A)</th>
                            <th>Location</th>
                            <th>Imbalance Qty</th>
                            <th>Days Inactive</th>
                        </tr>
                    </thead>
                    <tbody>
                        {polesData.aging.map((pole, index) => (
                            <tr key={index}>
                                <td>{pole.polarity}</td>
                                <td>{pole.rating}</td>
                                <td>{pole.location}</td>
                                <td>{pole.imbalanceQty}</td>
                                <td>{pole.daysInactive}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderImbalanceEntry = () => (
        <div className="form-container">
            <h2>Imbalance Entry</h2>
            <form onSubmit={handleImbalanceSubmit}>
                <div className="form-group">
                    <label htmlFor="polarity">Polarity:</label>
                    <select
                        id="polarity"
                        value={imbalancePolarity}
                        onChange={handleImbalancePolarityChange}
                        className={imbalanceValidationErrors.polarity ? 'is-invalid' : ''}
                    >
                        <option value="">Select Polarity</option>
                        <option value="2-Pole">2-Pole</option>
                        <option value="3-Pole">3-Pole</option>
                        <option value="4-Pole">4-Pole</option>
                    </select>
                    {imbalanceValidationErrors.polarity && <p className="validation-error">{imbalanceValidationErrors.polarity}</p>}
                </div>

                <div className="form-group">
                    <label htmlFor="rating">Rating (A):</label>
                    <input
                        type="number"
                        id="rating"
                        value={imbalanceRating}
                        onChange={handleImbalanceRatingChange}
                        className={imbalanceValidationErrors.rating ? 'is-invalid' : ''}
                    />
                    {imbalanceValidationErrors.rating && <p className="validation-error">{imbalanceValidationErrors.rating}</p>}
                </div>

                {quantityInputs}

                <button type="submit">Submit</button>
                <button type="reset" onClick={handleImbalanceReset}>Reset</button>
            </form>
        </div>
    );

    const renderBalanceEntry = () => (
        <div className="form-container">
            <h2>Balance Entry</h2>
            <form onSubmit={handleBalanceSubmit}>
                <div className="form-group">
                    <label htmlFor="polarity">Polarity:</label>
                    <select
                        id="polarity"
                        value={balancePolarity}
                        onChange={(e) => setBalancePolarity(e.target.value)}
                        className={balanceValidationErrors.polarity ? 'is-invalid' : ''}
                    >
                        <option value="">Select Polarity</option>
                        {getExistingPolarities().map(existingPolarity => (
                            <option key={existingPolarity} value={existingPolarity}>{existingPolarity}</option>
                        ))}
                    </select>
                    {balanceValidationErrors.polarity && <p className="validation-error">{balanceValidationErrors.polarity}</p>}
                </div>

                <div className="form-group">
                    <label htmlFor="rating">Rating (A):</label>
                    <select
                        id="rating"
                        value={balanceRating}
                        onChange={(e) => setBalanceRating(e.target.value)}
                        className={balanceValidationErrors.rating ? 'is-invalid' : ''}
                    >
                        <option value="">Select Rating</option>
                        {getExistingRatings().map(existingRating => (
                            <option key={existingRating} value={existingRating}>{existingRating}</option>
                        ))}
                    </select>
                    {balanceValidationErrors.rating && <p className="validation-error">{balanceValidationErrors.rating}</p>}
                </div>

                <div className="form-group">
                    <label htmlFor="location">Location:</label>
                    <select
                        id="location"
                        value={balanceLocation}
                        onChange={(e) => setBalanceLocation(e.target.value)}
                        className={balanceValidationErrors.location ? 'is-invalid' : ''}
                    >
                        <option value="">Select Location</option>
                        {getExistingLocations().map(existingLocation => (
                            <option key={existingLocation} value={existingLocation}>{existingLocation}</option>
                        ))}
                    </select>
                    {balanceValidationErrors.location && <p className="validation-error">{balanceValidationErrors.location}</p>}
                </div>

                <div className="form-group">
                    <label htmlFor="balancedQuantity">Balanced Quantity:</label>
                    <input
                        type="number"
                        id="balancedQuantity"
                        value={balancedQuantity}
                        onChange={(e) => setBalancedQuantity(e.target.value)}
                        className={balanceValidationErrors.balancedQuantity ? 'is-invalid' : ''}
                    />
                    {balanceValidationErrors.balancedQuantity && <p className="validation-error">{balanceValidationErrors.balancedQuantity}</p>}
                </div>

                <button type="submit">Submit</button>
                <button type="reset" onClick={handleBalanceReset}>Reset</button>
            </form>
        </div>
    );

    const renderLocationManagement = () => (
        <div className="form-container">
            <h2>Location Management</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleAddLocation(); }}>
                <div className="form-group">
                    <label htmlFor="newLocation">New Location:</label>
                    <input
                        type="text"
                        id="newLocation"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        className={locationValidationErrors.newLocation ? 'is-invalid' : ''}
                    />
                    {locationValidationErrors.newLocation && <p className="validation-error">{locationValidationErrors.newLocation}</p>}
                </div>

                <div className="form-group">
                    <label htmlFor="newRating">Rating (A):</label>
                    <input
                        type="number"
                        id="newRating"
                        value={newRating}
                        onChange={(e) => setNewRating(e.target.value)}
                        className={locationValidationErrors.newRating ? 'is-invalid' : ''}
                    />
                    {locationValidationErrors.newRating && <p className="validation-error">{locationValidationErrors.newRating}</p>}
                </div>

                <div className="form-group">
                    <label htmlFor="newPolarity">Polarity:</label>
                    <select
                        id="newPolarity"
                        value={newPolarity}
                        onChange={(e) => setNewPolarity(e.target.value)}
                        className={locationValidationErrors.newPolarity ? 'is-invalid' : ''}
                    >
                        <option value="">Select Polarity</option>
                        <option value="2-Pole">2-Pole</option>
                        <option value="3-Pole">3-Pole</option>
                        <option value="4-Pole">4-Pole</option>
                    </select>
                    {locationValidationErrors.newPolarity && <p className="validation-error">{locationValidationErrors.newPolarity}</p>}
                </div>

                <button type="submit">Add Location</button>
                <button type="reset" onClick={handleLocationReset}>Reset</button>
            </form>
        </div>
    );

    const renderSettings = () => (
        <div className="form-container">
            <h2>Settings</h2>
            <button onClick={handleClearData}>Clear All Data</button>
        </div>
    );

    return (
        <div className="app-container">
            <aside className="sidebar">
                <h2>Navigation</h2>
                <button onClick={() => setActivePage('dashboard')}>Dashboard</button>
                <button onClick={() => setActivePage('imbalanceEntry')}>Imbalance Entry</button>
                <button onClick={() => setActivePage('balanceEntry')}>Balance Entry</button>
                <button onClick={() => setActivePage('locationManagement')}>Location Management</button>
                <button onClick={() => setActivePage('settings')}>Settings</button>
            </aside>
            <main className="main-content">
                <header>
                    <h1>Imbalance Pole Monitoring System</h1>
                    <div>
                        <p>Current Date/Time: <CurrentDateAndTime /></p>
                    </div>
                </header>

                {activePage === 'dashboard' && renderDashboard()}
                {activePage === 'imbalanceEntry' && renderImbalanceEntry()}
                {activePage === 'balanceEntry' && renderBalanceEntry()}
                {activePage === 'locationManagement' && renderLocationManagement()}
                {activePage === 'settings' && renderSettings()}
            </main>
        </div>
    );
}

export default App;
