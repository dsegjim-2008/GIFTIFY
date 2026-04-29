import React from 'react';
import { ShoppingBag, Star } from 'lucide-react';

function RewardsView({ user, rewards, redeemReward }) {
    return (
        <div className="results-section">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
                <h2><ShoppingBag size={24} style={{verticalAlign: 'middle', marginRight: '10px'}}/> Tienda de Recompensas</h2>
                <div style={{background:'var(--card-bg)', padding:'10px 20px', borderRadius:'10px', border:'1px solid var(--border-color)'}}>
                    <span style={{fontSize:'1.2rem', fontWeight:'bold', color:'var(--primary-yellow)'}}>
                        <Star fill="currentColor" size={16}/> {user?.points || 0} pts
                    </span>
                </div>
            </div>
            <div className="grid-container" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))'}}>
                {rewards.map(reward => (
                    <div key={reward.id} className="artist-card" style={{cursor: 'default', display: 'flex', flexDirection: 'column'}}>
                        <img src={reward.photo_url} alt={reward.name} style={{width:'100%', height:'150px', objectFit:'cover', borderRadius: '8px', marginBottom: '10px'}} />
                        <h3>{reward.name}</h3>
                        <p style={{fontSize:'0.8rem', color:'var(--text-secondary)', flex: 1, marginBottom: '10px'}}>{reward.description}</p>
                        <button 
                            className="track-play-button" 
                            style={{width:'100%', background: user?.points >= reward.point_cost ? 'var(--primary-cyan)' : '#333', cursor: user?.points >= reward.point_cost ? 'pointer' : 'not-allowed'}} 
                            onClick={() => redeemReward(reward)}
                        >
                            Canjear ({reward.point_cost} pts)
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default RewardsView;