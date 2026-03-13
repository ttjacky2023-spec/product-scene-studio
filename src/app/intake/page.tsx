import styles from "../shared.module.css";

export default function IntakePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Intake Form</h1>
        <p>Collect every run requirement before planning generation.</p>
      </div>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Source image</h2>
          <div className={styles.formGrid}>
            <div><label>Product image path</label><input placeholder="/uploads/product-front.png" /></div>
            <div><label>Source resolution</label><input placeholder="5000 x 5000" /></div>
            <div><label>Product occupies % of frame</label><input placeholder="80" /></div>
            <div><label>Available views</label><input placeholder="front only / front+back / multi-view" /></div>
          </div>
        </section>
        <section className={styles.card}>
          <h2>Output request</h2>
          <div className={styles.formGrid}>
            <div><label>Aspect ratio</label><select><option>1:1</option><option>4:5</option><option>16:9</option><option>3:4</option></select></div>
            <div><label>Output pixel size</label><input placeholder="2000 x 2500" /></div>
            <div><label>Generation count</label><input placeholder="4" /></div>
            <div><label>Intended use</label><select><option>Amazon gallery</option><option>A+ / PDP</option><option>Ads</option><option>Social</option></select></div>
          </div>
        </section>
        <section className={styles.card}>
          <h2>Scene and placement</h2>
          <div className={styles.formGrid}>
            <div><label>Scene types</label><textarea placeholder="minimal tabletop, home kitchen, lifestyle hand-held" /></div>
            <div><label>Placement preference</label><textarea placeholder="center hero, left-weighted, in-use, shelf placement" /></div>
            <div><label>Angle tolerance</label><select><option>same angle only</option><option>slight angle shift</option><option>significant angle change</option></select></div>
            <div><label>Style preference</label><textarea placeholder="leave blank to infer from product type" /></div>
          </div>
        </section>
        <section className={styles.card}>
          <h2>Protection and approvals</h2>
          <div className={styles.formGrid}>
            <div><label>Preservation strictness</label><select><option>maximum preservation</option><option>balanced</option><option>concept-first</option></select></div>
            <div><label>Elements that must never change</label><textarea placeholder="logo, front title, certification icons" /></div>
            <div><label>Draft approval required?</label><select><option>yes</option><option>no</option></select></div>
            <div><label>Max iteration rounds</label><input placeholder="3" /></div>
          </div>
        </section>
      </div>
    </div>
  );
}
