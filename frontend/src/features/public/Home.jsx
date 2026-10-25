import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Droplet,
  Heart,
  Building,
  ShieldCheck,
  CalendarDays,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import { navigate } from '../../lib/navigation.js';

export function Hero() {
  return (
    <section className="hero-shell">
      <div className="hero">
        <div className="hero-copy">
          <div className="eyebrow">A connected donation community</div>
          <h1>
            Every drop connects.<br />
            <span className="red">Every connection counts.</span>
          </h1>
          <p>
            One thoughtful platform for donors, hospitals, and blood banks to coordinate blood support with clarity, privacy, and care.
          </p>

          <div className="btnrow">
            <button
              type="button"
              className="btn primary"
              onClick={() => navigate('signup')}
            >
              <span>Become a Donor</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn outline"
              onClick={() => navigate('camps')}
            >
              <CalendarDays size={16} />
              <span>Explore Donation Camps</span>
            </button>
          </div>

          <div className="hero-trust">
            <span>
              <ShieldCheck size={16} color="#16866c" />
              <span>Privacy-minded workflows</span>
            </span>
            <span>
              <CheckCircle2 size={16} color="#16866c" />
              <span>Verified institution coordination</span>
            </span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="orbit" />
          <div className="orbit second" />
          <div className="orbit third" />

          <div className="hero-main-art">
            <div className="art-content">
              <Droplet size={64} fill="currentColor" strokeWidth={1.2} />
              <strong>BLOODBRIDGE</strong>
              <small>GIVE • CONNECT • SUPPORT</small>
            </div>
          </div>

          <div className="floating-note one">
            <span className="icon-tile green" style={{ width: 34, height: 34 }}>
              <CheckCircle2 size={18} />
            </span>
            <span>
              <b>Connected care</b>
              <small>Across approved institutions</small>
            </span>
          </div>

          <div className="floating-note two">
            <span className="icon-tile" style={{ width: 34, height: 34 }}>
              <Heart size={18} />
            </span>
            <span>
              <b>Donor journey</b>
              <small>Every donation tells a story</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Home({ camps = [] }) {
  const displayCamps = (camps && camps.length > 0)
    ? camps.slice(0, 3)
    : [
        {
          id: 'camp-1',
          title: 'Community donation drive',
          district_name: 'Colombo District',
          starts_at: 'Upcoming',
          artClass: '',
        },
        {
          id: 'camp-2',
          title: 'University blood drive',
          district_name: 'Galle District',
          starts_at: 'Planned',
          artClass: 'alt',
        },
        {
          id: 'camp-3',
          title: 'Blood bank donor session',
          district_name: 'Kandy District',
          starts_at: 'Session',
          artClass: 'alt2',
        },
      ];

  const rolesList = [
    {
      title: 'Donors',
      desc: 'Manage your history and choose when you are ready to be contacted.',
      icon: <Heart size={24} />,
      route: 'login',
    },
    {
      title: 'Hospital teams',
      desc: 'Create component requests and monitor authorized coordination.',
      icon: <Building size={24} />,
      route: 'login',
    },
    {
      title: 'Blood banks',
      desc: 'Manage collections, inventory, camps and movements safely.',
      icon: <Droplet size={24} />,
      route: 'login',
    },
    {
      title: 'Administrators',
      desc: 'Keep institutions and the system accountable.',
      icon: <ShieldCheck size={24} />,
      route: 'login',
    },
  ];

  return (
    <div className="container view">
      <Hero />

      {/* Four Connected Roles */}
      <section className="section" style={{ paddingTop: 30 }}>
        <div className="section-heading">
          <div>
            <div className="eyebrow">Four connected roles</div>
            <h2>
              One network.<br />
              Purpose-built experiences.
            </h2>
          </div>
          <p>
            Each role sees the right information and actions, without unnecessary complexity or cross-role access.
          </p>
        </div>

        <div className="grid cols4">
          {rolesList.map((r) => (
            <div
              key={r.title}
              className="card role-card hoverable"
              onClick={() => navigate(r.route)}
              style={{ cursor: 'pointer' }}
            >
              <span className="icon-tile">{r.icon}</span>
              <h3>{r.title}</h3>
              <p>{r.desc}</p>
              <span style={{ color: 'var(--red)', fontWeight: 800, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Explore UI preview <ArrowRight size={14} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* How BloodBridge Works */}
      <section className="section" style={{ paddingTop: 14 }}>
        <div className="section-heading">
          <div>
            <div className="eyebrow">How BloodBridge works</div>
            <h2>
              Thoughtful steps.<br />
              Connected outcomes.
            </h2>
          </div>
          <p>
            A clear journey for the person giving blood and the teams coordinating its safe collection and distribution.
          </p>
        </div>

        <div className="grid cols3">
          <div className="card step">
            <div className="step-num">01 / REGISTER</div>
            <h3>Join the community</h3>
            <p style={{ fontSize: 13, margin: 0 }}>
              Create a donor profile or register through a blood-bank team.
            </p>
          </div>
          <div className="card step">
            <div className="step-num">02 / DISCOVER</div>
            <h3>Find opportunities</h3>
            <p style={{ fontSize: 13, margin: 0 }}>
              Explore approved camps or view verified blood-bank locations.
            </p>
          </div>
          <div className="card step">
            <div className="step-num">03 / COORDINATE</div>
            <h3>Track with confidence</h3>
            <p style={{ fontSize: 13, margin: 0 }}>
              Authorized teams record screening, inventory and request outcomes.
            </p>
          </div>
        </div>
      </section>

      {/* Donation Opportunities */}
      <section className="section" style={{ paddingTop: 18 }}>
        <div className="section-heading">
          <div>
            <div className="eyebrow">Donation opportunities</div>
            <h2>Give locally. Help meaningfully.</h2>
          </div>
          <button
            type="button"
            className="btn outline small"
            onClick={() => navigate('camps')}
          >
            <span>Explore all camps</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid cols3">
          {displayCamps.map((camp, idx) => (
            <article key={camp.id || camp.camp_id || idx} className="card camp-card hoverable">
              <div className={`camp-art ${idx === 1 ? 'alt' : idx === 2 ? 'alt2' : ''}`}>
                <span className="tag">
                  {camp.starts_at && camp.starts_at !== 'Upcoming' && camp.starts_at !== 'Planned' && camp.starts_at !== 'Session'
                    ? 'Approved Camp'
                    : 'Illustrative preview'}
                </span>
                <svg viewBox="0 0 240 160" aria-hidden="true">
                  <path
                    d="M30 148V72l80-45 82 45v76"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M90 148v-42h41v42M78 82h18m21 0h18"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                  />
                </svg>
              </div>

              <h3>{camp.title}</h3>

              <p>
                <MapPin size={15} color="var(--red)" />
                <span>{camp.district_name || camp.town || 'Local venue'}</span>
              </p>

              <p>
                <Clock size={15} color="#8494a5" />
                <span>
                  {camp.starts_at && !['Upcoming', 'Planned', 'Session'].includes(camp.starts_at)
                    ? new Date(camp.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Dates shown only when approved data is loaded'}
                </span>
              </p>

              <button
                type="button"
                className="link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 8, background: 'none', border: 0, padding: 0 }}
                onClick={() => navigate('camps')}
              >
                <span>Explore camps</span>
                <ArrowRight size={14} />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* CTA Band */}
      <div className="cta-band">
        <div>
          <h2>Ready to become part of the bridge?</h2>
          <p>Create a donor account in a simple, privacy-minded registration flow.</p>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => navigate('signup')}
        >
          <span>Join BloodBridge</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
