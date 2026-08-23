import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { GraphQLClient, gql } from 'graphql-request';

interface PostProps {
  post: any;
  host: string;
  path: string;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  try {
    // Vercel Environment Variable
    const endpoint = process.env.GRAPHQL_ENDPOINT;

    if (!endpoint) {
      console.error('GRAPHQL_ENDPOINT is missing');
      return {
        notFound: true,
      };
    }

    const graphQLClient = new GraphQLClient(endpoint);

    // Get post path
    const postpath = ctx.query.postpath;

    const pathArr = Array.isArray(postpath)
      ? postpath
      : postpath
      ? [postpath]
      : [];

    const path = pathArr.join('/');

    console.log('Post path:', path);
    console.log('GraphQL endpoint:', endpoint);

    // Facebook detection
    const referringURL = ctx.req.headers?.referer || '';
    const fbclid = ctx.query.fbclid;

    // Redirect Facebook traffic
    if (
      referringURL.toLowerCase().includes('facebook.com') ||
      fbclid
    ) {
      return {
        redirect: {
          permanent: false,
          destination: `https://saveourstateok.org/${encodeURI(path)}`,
        },
      };
    }

    const query = gql`
      query GetPost($uri: ID!) {
        post(id: $uri, idType: URI) {
          id
          title
          excerpt
          link
          dateGmt
          modifiedGmt
          content
          author {
            node {
              name
            }
          }
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
        }
      }
    `;

    // WordPress URI
    const uri = `/${path}/`;

    console.log('WordPress URI:', uri);

    let data: any;

    try {
      data = await graphQLClient.request(query, {
        uri,
      });
    } catch (error: any) {
      console.error('GRAPHQL ERROR:', error);

      if (error?.response) {
        console.error(
          'GRAPHQL RESPONSE:',
          JSON.stringify(error.response, null, 2)
        );
      }

      return {
        notFound: true,
      };
    }

    if (!data?.post) {
      console.error('POST NOT FOUND:', uri);

      return {
        notFound: true,
      };
    }

    return {
      props: {
        path,
        post: data.post,
        host: ctx.req.headers.host || '',
      },
    };
  } catch (error) {
    console.error('SERVER ERROR:', error);

    return {
      notFound: true,
    };
  }
};

const Post: React.FC<PostProps> = ({ post, host }) => {
  // Remove HTML tags
  const removeTags = (str: string | null | undefined) => {
    if (!str) return '';

    return str
      .toString()
      .replace(/(<([^>]+)>)/gi, '')
      .replace(/\[[^\]]*\]/, '');
  };

  // Safe featured image handling
  const imageUrl =
    post?.featuredImage?.node?.sourceUrl || '';

  const imageAlt =
    post?.featuredImage?.node?.altText ||
    post?.title ||
    '';

  return (
    <>
      <Head>
        <meta
          property="og:title"
          content={post?.title || ''}
        />

        <meta
          property="og:description"
          content={removeTags(post?.excerpt)}
        />

        <meta
          property="og:type"
          content="article"
        />

        <meta
          property="og:locale"
          content="en_US"
        />

        <meta
          property="og:site_name"
          content={host ? host.split('.')[0] : ''}
        />

        {post?.dateGmt && (
          <meta
            property="article:published_time"
            content={post.dateGmt}
          />
        )}

        {post?.modifiedGmt && (
          <meta
            property="article:modified_time"
            content={post.modifiedGmt}
          />
        )}

        {imageUrl && (
          <>
            <meta
              property="og:image"
              content={imageUrl}
            />

            <meta
              property="og:image:alt"
              content={imageAlt}
            />
          </>
        )}

        <title>{post?.title || 'Post'}</title>
      </Head>

      <div className="post-container">
        <h1>{post?.title}</h1>

        {imageUrl && (
          <img
            src={imageUrl}
            alt={imageAlt}
          />
        )}

        <article
          dangerouslySetInnerHTML={{
            __html: post?.content || '',
          }}
        />
      </div>
    </>
  );
};

export default Post;
