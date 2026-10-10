import { FacebookIcon, HeartIcon, TwitterIcon } from "@/components/icons";

export function SiteFooter() {
  return (
    <footer className="absolute inset-x-0 bottom-0 box-border h-48 px-5 py-[27px] text-center text-sm font-light leading-[1.93] tracking-[-0.3px] text-muted">
      <div className="mb-[45px]">
        © 2011-{new Date().getFullYear()} AirForShare.com
      </div>

      <div className="mb-[45px]">
        Made in{" "}
        <a
          href="https://birdscorp.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="relative transition-colors hover:text-accent-hover"
        >
          BirdsCorp.com
        </a>{" "}
        with <HeartIcon className="inline-block h-[14px] w-[14px] align-[-2px]" />
      </div>

      <ul className="list-none">
        <li className="mx-[21px] inline-block align-top">
          <a
            href="https://www.facebook.com/airforshare"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="AirForShare on Facebook"
            className="group flex h-[30px] w-[30px] items-center"
          >
            <FacebookIcon className="h-auto w-full transition-colors [&_path]:transition-[fill] [&_path]:group-hover:fill-heading" />
          </a>
        </li>
        <li className="mx-[21px] inline-block align-top">
          <a
            href="https://www.twitter.com/airforshare"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="AirForShare on Twitter"
            className="group flex h-[30px] w-[30px] items-center"
          >
            <TwitterIcon className="h-auto w-full [&_path]:transition-[fill] [&_path]:group-hover:fill-heading" />
          </a>
        </li>
      </ul>
    </footer>
  );
}
