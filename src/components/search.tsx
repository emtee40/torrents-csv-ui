import { Component, linkEvent } from 'inferno';
import moment from 'moment';

import { endpoint } from '../env';
import { SearchParams, Results, Torrent } from '../interfaces';
import { humanFileSize, magnetLink, getFileName, repoUrl } from '../utils';

interface State {
  results: Results;
  searchParams: SearchParams;
  searching: boolean;
}

export class Search extends Component<any, State> {
  state: State = {
    results: {
      torrents: [],
    },
    searchParams: {
      q: '',
      page: 1,
    },
    searching: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentDidMount() {
    this.state.searchParams = {
      page: Number(this.props.match.params.page),
      q: this.props.match.params.q,
    };
    this.search();
  }

  // Re-do search if the props have changed
  componentDidUpdate(lastProps: any) {
    if (lastProps.match && lastProps.match.params !== this.props.match.params) {
      this.state.searchParams = {
        page: Number(this.props.match.params.page),
        q: this.props.match.params.q,
      };
      this.search();
    }
  }

  search() {
    if (!!this.state.searchParams.q) {
      this.setState({ searching: true, results: { torrents: [] } });
      this.fetchData(this.state.searchParams)
        .then(torrents => {
          if (!!torrents) {
            this.setState({
              results: {
                torrents: torrents,
              },
            });
          }
        })
        .catch(error => {
          console.error('request failed', error);
        })
        .then(() => this.setState({ searching: false }));
    } else {
      this.setState({ results: { torrents: [] } });
    }
  }

  async fetchData(searchParams: SearchParams): Promise<Torrent[]> {
    let q = encodeURI(searchParams.q);
    return (
      await fetch(`${endpoint}/service/search?q=${q}&page=${searchParams.page}`)
    ).json();
  }

  render() {
    return (
      <div>
        {this.state.searching
          ? this.spinner()
          : this.state.results.torrents[0]
          ? this.torrentsTable()
          : this.noResults()}
      </div>
    );
  }

  spinner() {
    return (
      <div class="text-center m-5 p-5">
        <svg class="icon icon-spinner spinner">
          <use xlinkHref="#icon-spinner"></use>
        </svg>
      </div>
    );
  }

  noResults() {
    return (
      <div class="text-center m-5 p-5">
        <h1>No Results</h1>
      </div>
    );
  }

  torrentsTable() {
    return (
      <div>
        <table class="table table-fixed table-hover table-sm table-striped table-hover-purple table-padding">
          <thead>
            <tr>
              <th class="search-name-col">Name</th>
              <th class="text-right">Size</th>
              <th class="text-right">Seeds</th>
              <th class="text-right d-none d-md-table-cell">Leeches</th>
              <th class="text-right d-none d-md-table-cell">Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {this.state.results.torrents.map(torrent => (
              <tr>
                {!torrent.name ? (
                  <td className="path_column">
                    <a
                      class="text-body"
                      href={magnetLink(
                        torrent.infohash,
                        torrent.path,
                        torrent.index_
                      )}
                    >
                      {getFileName(torrent.path)}
                    </a>
                  </td>
                ) : (
                  <td class="search-name-cell">
                    <a
                      class="text-body"
                      href={magnetLink(
                        torrent.infohash,
                        torrent.name,
                        torrent.index_
                      )}
                    >
                      {torrent.name}
                    </a>
                  </td>
                )}
                <td class="text-right text-muted">
                  {humanFileSize(torrent.size_bytes, false)}
                </td>
                <td class="text-right text-success">
                  <svg class="icon icon-arrow-up d-none d-sm-inline mr-1">
                    <use xlinkHref="#icon-arrow-up"></use>
                  </svg>
                  <span>{torrent.seeders}</span>
                </td>
                <td class="text-right text-danger d-none d-md-table-cell">
                  <svg class="icon icon-arrow-down mr-1">
                    <use xlinkHref="#icon-arrow-down"></use>
                  </svg>
                  <span>{torrent.leechers}</span>
                </td>
                <td
                  class="text-right text-muted d-none d-md-table-cell"
                  data-balloon={`Scraped ${moment(
                    torrent.scraped_date * 1000
                  ).fromNow()}`}
                  data-balloon-pos="down"
                >
                  {moment(torrent.created_unix * 1000).fromNow()}
                </td>
                <td class="text-right">
                  <span
                    class="btn btn-sm no-outline px-1"
                    data-balloon="Copy Magnet link to clipboard"
                    data-balloon-pos="left"
                    data-href={magnetLink(
                      torrent.infohash,
                      torrent.name ? torrent.name : torrent.path,
                      torrent.index_
                    )}
                    onClick={this.copyLink}
                  >
                    <svg class="icon icon-copy">
                      <use xlinkHref="#icon-copy"></use>
                    </svg>
                  </span>
                  <a
                    class="btn btn-sm no-outline px-1"
                    href={magnetLink(
                      torrent.infohash,
                      torrent.name ? torrent.name : torrent.path,
                      torrent.index_
                    )}
                    data-balloon="Magnet link"
                    data-balloon-pos="left"
                  >
                    <svg class="icon icon-magnet">
                      <use xlinkHref="#icon-magnet"></use>
                    </svg>
                  </a>
                  <a
                    class="btn btn-sm no-outline px-1 d-none d-sm-inline"
                    href={`${repoUrl}/issues/new?issue[title]=Report%20Torrent%20infohash%20${torrent.infohash}`}
                    target="_blank"
                    data-balloon="Report Torrent"
                    data-balloon-pos="left"
                  >
                    <svg class="icon icon-flag">
                      <use xlinkHref="#icon-flag"></use>
                    </svg>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {this.paginator()}
      </div>
    );
  }

  paginator() {
    return (
      <nav>
        <ul class="pagination justify-content-center">
          <li
            className={
              this.state.searchParams.page == 1
                ? 'page-item disabled'
                : 'page-item'
            }
          >
            <button
              class="page-link"
              onClick={linkEvent({ i: this, nextPage: false }, this.switchPage)}
            >
              Previous
            </button>
          </li>
          <li class="page-item">
            <button
              class="page-link"
              onClick={linkEvent({ i: this, nextPage: true }, this.switchPage)}
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    );
  }

  switchPage(a: { i: Search; nextPage: boolean }) {
    let newSearch = a.i.state.searchParams;
    newSearch.page += a.nextPage ? 1 : -1;
    a.i.props.history.push(`/search/torrent/${newSearch.q}/${newSearch.page}`);
  }

  copyLink(evt: any) {
    const href = evt.currentTarget.dataset.href;
    try {
      navigator.clipboard
        .writeText(href)
        .then(() => alert('Copied magnet URL to clipboard'));
    } catch {
      alert(`Could not copy magnet URL: ${href}`);
    }
  }
}
