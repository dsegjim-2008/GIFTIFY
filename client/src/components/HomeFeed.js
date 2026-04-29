import React from 'react';
import { Clock, Play } from 'lucide-react';

function HomeFeed({ homeFeed, playContent, setSelectedDynamicList }) {
    if (!homeFeed) return <div className="loading-spinner"></div>;

    return (
        <div className="home-feed-wrapper">
            {homeFeed.recentlyPlayed.length > 0 && (
                <div className="shelf-section">
                    <h2 className="shelf-title"><Clock size={22} color="var(--primary-cyan)" /> Recientemente escuchado</h2>
                    <div className="horizontal-scroll">
                        {homeFeed.recentlyPlayed.map(item => (
                            <div key={item.id} className="horizontal-card" onClick={() => playContent(item.uri, {artist_name: item.artist})}>
                                <div className="horizontal-image-container">
                                    <img src={item.image} className="horizontal-image" alt="" />
                                    <div className="play-overlay"><Play fill="currentColor" size={24} /></div>
                                </div>
                                <div className="horizontal-title">{item.name}</div>
                                <div className="horizontal-subtitle">{item.artist}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="dynamic-mixes-container">
                {homeFeed.mixRelacionados?.tracks.length > 0 && (
                    <div className="dynamic-mix-box mix-box" onClick={() => setSelectedDynamicList(homeFeed.mixRelacionados)}>
                        <div className="dynamic-mix-title">{homeFeed.mixRelacionados.title}</div>
                        <div className="dynamic-mix-subtitle">{homeFeed.mixRelacionados.subtitle}</div>
                        <div className="dynamic-mix-images">
                            {homeFeed.mixRelacionados.images.map((img, i) => <img key={i} src={img} alt="" />)}
                        </div>
                    </div>
                )}
                {homeFeed.radarNovedades?.tracks.length > 0 && (
                    <div className="dynamic-mix-box radar-box" onClick={() => setSelectedDynamicList(homeFeed.radarNovedades)}>
                        <div className="dynamic-mix-title">{homeFeed.radarNovedades.title}</div>
                        <div className="dynamic-mix-subtitle">{homeFeed.radarNovedades.subtitle}</div>
                        <div className="dynamic-mix-images">
                            {homeFeed.radarNovedades.images.map((img, i) => <img key={i} src={img} alt="" />)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default HomeFeed;