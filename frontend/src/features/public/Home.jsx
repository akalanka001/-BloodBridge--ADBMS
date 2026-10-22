import React from 'react';
import {
  ArrowRight, CheckCircle2, Droplet, Heart, HeartHandshake, Hospital, CalendarDays,
} from 'lucide-react';
import { IconTile } from '../../components/ui/IconTile.jsx';
import { Badge, SectionTitle } from '../../components/ui/Typography.jsx';
import { navigate } from '../../lib/navigation.js';
import { CampCard } from '../camps/CampCard.jsx';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-text">
        <Badge className="on-dark">Sri Lanka · Blood donation network</Badge>
        <h1>Every drop connects <em>us all.</em></h1>
        <p>
          Discover community donation camps, register as a donor, and bring hospitals and blood
          banks together in one coordinated platform.
        </p>
        <div className="hero-actions">
          <button className="primary" onClick={() => navigate('signup')}>
            Become a Donor <ArrowRight size={19} />
          </button>
          <button className="ghost" onClick={() => navigate('camps')}>
            Explore Donation Camps
          </button>
        </div>
        <div className="hero-tagline">
          <span className="pulse-dot" /> A prototype designed for Sri Lankan communities
        </div>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="orbit a" />
        <div className="orbit b" />
        <div className="illustrated-drop">
          <Droplet size={152} strokeWidth={1.5} fill="white" color="white" />
          <Heart size={53} fill="#C9263E" color="#C9263E" className="drop-heart" />
        </div>
        <div className="float-note">
          <CheckCircle2 size={19} color="#14856A" />
          <div>
            <strong>One connected network</strong>
            <small>Donors · Hospitals · Blood Banks</small>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Features() {
  const features = [
    {
      Icon: HeartHandshake,
      title: 'Give blood, give hope',
      desc: 'Register as a donor, set your availability, and discover relevant donation opportunities.',
    },
    {
      Icon: Hospital,
      title: 'Coordinate urgent needs',
      desc: 'Hospital staff can make component-specific blood requests through authorized workflows.',
    },
    {
      Icon: Droplet,
      title: 'Track available units',
      desc: 'Blood-bank staff manage released component inventory and traceable reservations.',
    },
  ];
  return (
    <section className="block-space">
      <SectionTitle
        title="Built around people and purpose"
        subtitle="Separate experiences, one consistent blood coordination system."
      />
      <div className="three-grid">
        {features.map((x) => (
          <div className="surface-card feature" key={x.title}>
            <IconTile Icon={x.Icon} />
            <h3>{x.title}</h3>
            <p>{x.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Home({ camps }) {
  return (
    <>
      <Hero />
      <Features />
      <section className="block-space">
        <SectionTitle
          title="Donation camps near your community"
          subtitle="Only approved camps appear in live results. No fictional events are presented as real."
        />
        <div className="camps-preview">
          {camps.length ? (
            camps.slice(0, 3).map((c) => <CampCard key={c.camp_id} camp={c} />)
          ) : (
            <div className="empty-card">
              <CalendarDays size={31} />
              <strong>No approved upcoming camps in the demo database yet.</strong>
              <p>A verified blood-bank account can create and approve the first camp.</p>
              <button className="text-link" onClick={() => navigate('camps')}>
                Open camp finder <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </section>
      <section className="bottom-cta">
        <Heart size={30} />
        <div>
          <h2>Be part of something meaningful.</h2>
          <p>Join the BloodBridge donor community and keep your donation preferences updated.</p>
        </div>
        <button className="light-button" onClick={() => navigate('signup')}>
          Create donor account <ArrowRight size={17} />
        </button>
      </section>
    </>
  );
}
