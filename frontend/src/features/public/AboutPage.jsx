import React from 'react';
import { ArrowRight, Heart, Sparkles, ShieldCheck, User, Building } from 'lucide-react';
import { navigate } from '../../lib/navigation.js';

export function AboutPage() {
  return (
    <div className="container view" style={{ paddingTop: 20 }}>
      <section className="about-hero">
        <div className="copy">
          <div className="eyebrow">About BloodBridge</div>
          <h1>
            Technology that helps<br />
            <span className="red">communities connect.</span>
          </h1>
          <p>
            BloodBridge is an academic prototype exploring how donors, hospitals, and blood banks can coordinate information through one secure, role-based platform.
          </p>
          <div className="btnrow" style={{ marginTop: 24 }}>
            <button type="button" className="btn primary" onClick={() => navigate('signup')}>
              <span>Join as a donor</span>
              <ArrowRight size={16} />
            </button>
            <button type="button" className="btn outline" onClick={() => navigate('home')}>
              Back to home
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Our purpose</div>
            <h2>A clearer path from willingness to impact.</h2>
          </div>
          <p>
            Our project focuses on trustworthy records, transparent workflows, geographic coordination, and appropriate access to sensitive information.
          </p>
        </div>
        <div className="grid cols3">
          <article className="card value hoverable">
            <span className="icon-tile"><Heart size={24} /></span>
            <h3>Mission</h3>
            <p>Make donation coordination more understandable and connected.</p>
          </article>
          <article className="card value hoverable">
            <span className="icon-tile"><Sparkles size={24} /></span>
            <h3>Vision</h3>
            <p>Explore a responsible digital network for the blood donation ecosystem.</p>
          </article>
          <article className="card value hoverable">
            <span className="icon-tile"><ShieldCheck size={24} /></span>
            <h3>Principles</h3>
            <p>Privacy, verification, accountability and human oversight.</p>
          </article>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 7 }}>
        <div className="section-heading">
          <div>
            <div className="eyebrow">How the roles connect</div>
            <h2>One process, four perspectives.</h2>
          </div>
        </div>
        <div className="about-flow">
          <div className="mini">
            <User size={28} />
            <b>Donor</b>
            <small>Profile &amp; interest</small>
          </div>
          <ArrowRight size={18} color="#9aa7b4" />
          <div className="mini">
            <Building size={28} />
            <b>Blood bank</b>
            <small>Assess &amp; manage</small>
          </div>
          <ArrowRight size={18} color="#9aa7b4" />
          <div className="mini">
            <Heart size={28} />
            <b>Hospital</b>
            <small>Request &amp; receive</small>
          </div>
          <ArrowRight size={18} color="#9aa7b4" />
          <div className="mini">
            <ShieldCheck size={28} />
            <b>Admin</b>
            <small>Verify &amp; oversee</small>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 8 }}>
        <div className="card" style={{ background: '#f3f7fb', padding: 30 }}>
          <div className="eyebrow">Transparency matters</div>
          <h3>Academic prototype, not clinical service</h3>
          <p style={{ margin: 0, maxWidth: 850 }}>
            This reference illustrates an academic BloodBridge system. Clinical assessment, blood compatibility, collection, testing and release require appropriate authorized professionals and verified real-world processes. Demo figures and records must never be mistaken for live emergencies or actual stock availability.
          </p>
        </div>
      </section>
    </div>
  );
}
