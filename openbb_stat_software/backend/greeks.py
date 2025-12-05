import numpy as np
from scipy.stats import norm

def calculate_greeks(S, K, T, r, sigma, option_type="call"):
    """
    Calculate Black-Scholes Greeks for a European option.
    
    Parameters:
    S : float : Current stock price
    K : float : Strike price
    T : float : Time to expiration in years
    r : float : Risk-free interest rate (decimal, e.g. 0.05 for 5%)
    sigma : float : Implied Volatility (decimal, e.g. 0.2 for 20%)
    option_type : str : "call" or "put"
    
    Returns:
    dict : Delta, Gamma, Theta, Vega, Rho
    """
    
    # Avoid division by zero for expiring options
    if T <= 0:
        return {
            "delta": 0.0,
            "gamma": 0.0,
            "theta": 0.0,
            "vega": 0.0,
            "rho": 0.0
        }

    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    
    if option_type == "call":
        delta = norm.cdf(d1)
        rho = K * T * np.exp(-r * T) * norm.cdf(d2)
        theta = (- (S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) 
                 - r * K * np.exp(-r * T) * norm.cdf(d2))
    else:
        delta = norm.cdf(d1) - 1
        rho = -K * T * np.exp(-r * T) * norm.cdf(-d2)
        theta = (- (S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) 
                 + r * K * np.exp(-r * T) * norm.cdf(-d2))

    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    vega = S * norm.pdf(d1) * np.sqrt(T)
    
    # Normalize Theta to "per day" decay usually seen in brokerages
    theta = theta / 365.0
    
    # Vega is usually shown as change per 1% change in IV, so divide by 100
    vega = vega / 100.0

    return {
        "delta": float(delta),
        "gamma": float(gamma),
        "theta": float(theta),
        "vega": float(vega),
        "rho": float(rho)
    }
