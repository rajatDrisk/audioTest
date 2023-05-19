import Image from "next/image";
import styles from "./page.module.css";
import Audio from "../components/Audio";

export default function Home() {
  return (
    <main className={styles.main}>
      <Audio />
    </main>
  );
}
