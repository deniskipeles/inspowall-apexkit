import { apex } from '@/lib/apex';

export function Footer() {
  const year = new Date().getFullYear();

  const credits = [
    {
      name: 'ApexKit',
      url: 'https://github.com/deniskipeles/apexkit',
      description: 'MultiTenancy Baas',
    },
    {
      name: 'Inspowall',
      url: 'https://github.com/deniskipeles/inspowall-apexkit',
      description: 'Open source',
    },
    {
      name: 'Unsplash',
      url: 'https://unsplash.com',
      description: 'Photography',
    },
    {
      name: 'Pexels',
      url: 'https://www.pexels.com',
      description: 'Photography',
    },
    {
      name: 'Cloudflare',
      url: 'https://pages.cloudflare.com',
      description: 'Frontend hosting',
    },
    {
      name: 'Hugging Face',
      url: 'https://huggingface.co/spaces',
      description: 'Backend hosting',
    },
  ];

  return (
    <footer className="border-t border-black/10 dark:border-white/10 mt-16 py-10 px-4 md:px-8 max-w-[1800px] mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden transform -rotate-6 shadow-[0_0_10px_rgba(204,255,0,0.2)] flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${apex.baseUrl}/logo`} alt="InspoWall" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-display font-bold text-sm text-ink-invert">InspoWall</span>
            <p className="text-xs text-gray-500">© {year} All rights reserved.</p>
          </div>
        </div>

        {/* Credits */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <span className="text-xs text-gray-500 w-full md:w-auto text-center md:text-left">
            Powered by &amp; built with
          </span>
          {credits.map((credit) => (
            <a
              key={credit.url}
              href={credit.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group flex flex-col items-center gap-0.5"
            >
              <span className="text-sm font-medium text-gray-500 group-hover:text-neon transition-colors">
                {credit.name}
              </span>
              <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                {credit.description}
              </span>
            </a>
          ))}
        </div>

        {/* Legal */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <a href="https://unsplash.com/license" target="_blank" rel="noreferrer noopener" className="hover:text-neon transition-colors">
            Unsplash License
          </a>
          <span>·</span>
          <a href="https://www.pexels.com/license/" target="_blank" rel="noreferrer noopener" className="hover:text-neon transition-colors">
            Pexels License
          </a>
        </div>
      </div>
    </footer>
  );
}