import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Droplet,
  Heart,
  Hospital,
  Building,
  ShieldCheck,
  CalendarDays,
  Activity,
  Users,
} from 'lucide-react';
import { Badge, SectionTitle } from '../../components/ui/Typography.jsx';
import { navigate } from '../../lib/navigation.js';
import { CampCard } from '../camps/CampCard.jsx';

export function Hero() {
  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #FFF1F3 0%, #FFE2E8 100%)',
        borderRadius: 28,
        padding: '52px 48px',
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: 32,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 12px 36px rgba(219, 54, 84, 0.06)',
        marginBottom: 48,
      }}
    >
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#FFFFFF',
            padding: '5px 14px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            color: '#DB3654',
            letterSpacing: 1.5,
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          THE GIFT OF CONNECTION
        </div>

        <h1
          style={{
            fontSize: 'clamp(36px, 4.5vw, 56px)',
            fontWeight: 850,
            color: '#1D3043',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            margin: '0 0 14px 0',
          }}
        >
          Every drop connects <br />
          <span style={{ color: '#DB3654' }}>builds a bridge.</span>
        </h1>

        <div style={{ width: 65, height: 5, borderRadius: 3, background: '#DB3654', marginBottom: 18 }} />

        <p style={{ fontSize: 16, color: '#5E7184', lineHeight: 1.6, maxWidth: 520, margin: '0 0 28px 0' }}>
          Connecting donors, hospitals, and blood banks to make timely blood support easier to coordinate across Sri Lanka.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 32 }}>
          <button
            type="button"
            className="dash-btn-primary"
            style={{ minHeight: 48, padding: '0 24px', fontSize: 15 }}
            onClick={() => navigate('signup')}
          >
            <span>Become a Donor</span>
            <ArrowRight size={18} />
          </button>
          <button
            type="button"
            className="reg-btn-outline"
            style={{ minHeight: 48, padding: '0 22px', fontSize: 15 }}
            onClick={() => navigate('camps')}
          >
            <span>Explore Donation Camps</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#FFFFFF',
                color: '#16A085',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <CheckCircle2 size={16} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 650, color: '#1D3043' }}>Trusted coordination</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#FFFFFF',
                color: '#16A085',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <ShieldCheck size={16} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 650, color: '#1D3043' }}>Privacy first</span>
          </div>
        </div>
      </div>

      {/* Hero Right Visual: Floating Blood Bag with ECG Line & Badges */}
      <div style={{ position: 'relative', height: 380, display: 'grid', placeItems: 'center' }} aria-hidden="true">
        {/* Floating background orbits */}
        <div
          style={{
            position: 'absolute',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.65)',
            filter: 'blur(30px)',
          }}
        />

        {/* Central Blood Donation Bag Card */}
        <div
          style={{
            width: 210,
            height: 300,
            borderRadius: 26,
            background: '#FFFFFF',
            boxShadow: '0 18px 45px rgba(219, 54, 84, 0.16)',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            zIndex: 3,
          }}
        >
          <div style={{ width: 130, height: 22, borderRadius: 10, background: '#F1F5F9', marginBottom: 12 }} />
          <div
            style={{
              flex: 1,
              width: '100%',
              borderRadius: 18,
              background: 'linear-gradient(135deg, #F45D73 0%, #C52548 100%)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              textAlign: 'center',
            }}
          >
            <strong style={{ fontSize: 19, fontWeight: 900, letterSpacing: 2 }}>BLOOD</strong>
            <small style={{ fontSize: 11, fontWeight: 750, letterSpacing: 2.5, opacity: 0.9 }}>DONATION</small>

            {/* Glowing ECG heartbeat line */}
            <svg viewBox="0 0 140 40" width="100%" height="40" style={{ marginTop: 16, overflow: 'visible' }}>
              <path
                d="M 10 20 L 40 20 L 52 5 L 68 35 L 82 12 L 96 24 L 130 20"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Floating Top Right Badge */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 0,
            background: '#FFFFFF',
            borderRadius: 14,
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(28, 57, 85, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 4,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#FDE9EF',
              color: '#DB3654',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Users size={16} />
          </div>
          <div>
            <span style={{ fontSize: 10, fontWeight: 650, color: '#7A8B9E', display: 'block' }}>Nearby help</span>
            <strong style={{ fontSize: 12, color: '#1D3043' }}>Donor network</strong>
          </div>
        </div>

        {/* Floating Bottom Left Badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: 0,
            background: '#FFFFFF',
            borderRadius: 14,
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(28, 57, 85, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 4,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#E4F7F3',
              color: '#16A085',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CheckCircle2 size={16} />
          </div>
          <div>
            <strong style={{ fontSize: 12, color: '#1D3043', display: 'block' }}>Request connected</strong>
            <span style={{ fontSize: 10, color: '#7A8B9E' }}>Coordinated care network</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FourRolesSection() {
  const roles = [
    {
      title: 'Blood donors',
      desc: 'Be part of the change.',
      Icon: Heart,
      target: 'signup',
      btnText: 'Register as donor',
    },
    {
      title: 'Hospital teams',
      desc: 'Coordinate blood requests.',
      Icon: Hospital,
      target: 'login',
      btnText: 'Hospital portal',
    },
    {
      title: 'Blood banks',
      desc: 'Manage stock with clarity.',
      Icon: Droplet,
      target: 'login',
      btnText: 'Blood bank access',
    },
    {
      title: 'Administrators',
      desc: 'Keep the network connected.',
      Icon: ShieldCheck,
      target: 'login',
      btnText: 'System control',
    },
  ];

  return (
    <section className="block-space" style={{ marginTop: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 32px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1D3043', margin: '0 0 8px' }}>
          One connected platform. Four essential roles.
        </h2>
        <p style={{ fontSize: 14, color: '#7A8B9E', margin: 0 }}>
          Made for the people who give, request, manage, and coordinate blood support.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
        {roles.map((r, i) => {
          const Icon = r.Icon;
          return (
            <div
              key={i}
              className="dash-card"
              style={{
                padding: '24px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
              }}
              onClick={() => navigate(r.target)}
            >
              <div>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 14,
                    background: '#FFF0F2',
                    color: '#DB3654',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Icon size={24} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 750, color: '#1D3043', margin: '0 0 6px' }}>{r.title}</h3>
                <p style={{ fontSize: 13, color: '#7A8B9E', margin: 0 }}>{r.desc}</p>
              </div>

              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, color: '#DB3654', fontSize: 13, fontWeight: 700 }}>
                <span>{r.btnText}</span>
                <ArrowRight size={14} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Home({ camps }) {
  return (
    <>
      <Hero />
      <FourRolesSection />

      {/* Donation Camps near your community */}
      <section className="block-space" style={{ marginTop: 48 }}>
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

      {/* Bottom CTA */}
      <section className="bottom-cta" style={{ marginTop: 48 }}>
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
